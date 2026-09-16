package me.janaka.assetcare.api;

import static me.janaka.assetcare.support.TestUsers.admin;
import static me.janaka.assetcare.support.TestUsers.alice;
import static me.janaka.assetcare.support.TestUsers.audrey;
import static me.janaka.assetcare.support.TestUsers.bob;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;
import me.janaka.assetcare.support.PostgresIT;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

/** The whole business workflow through HTTP, against PostgreSQL, with security on. This is what the Definition of Done asks for. */
@AutoConfigureMockMvc
class AssetApiIT extends PostgresIT {

    static final String COMPUTER = "0195b7a0-0000-7000-8000-000000000001";
    static final String VEHICLE = "0195b7a0-0000-7000-8000-000000000003";

    @Autowired MockMvc mvc;

    static String asset(String name, String tag) {
        return """
                {"name":"%s","assetTag":"%s","categoryId":"%s","manufacturer":"Apple","model":"M4","purchaseDate":"2025-01-15",
                 "purchasePrice":2499.00,"currency":"CHF","warrantyUntil":"2027-01-15","location":"Zug"}""".formatted(name, tag, COMPUTER);
    }

    @Test
    void anonymousIsRejected() throws Exception {
        mvc.perform(get("/api/v1/assets")).andExpect(status().isUnauthorized());
        mvc.perform(get("/actuator/health/readiness")).andExpect(status().isOk());
    }

    @Test
    void fullWorkflow_create_search_read_update_conflict_maintenance_history_archive() throws Exception {
        // create, with an Idempotency-Key: the retry returns the same asset
        MvcResult created = mvc.perform(post("/api/v1/assets").with(alice()).contentType(MediaType.APPLICATION_JSON)
                        .header("Idempotency-Key", "create-laptop-0001").content(asset("MacBook Pro", "LAPTOP-1")))
                .andExpect(status().isCreated()).andExpect(header().exists("Location")).andExpect(header().string("ETag", "\"0\""))
                .andExpect(jsonPath("$.status").value("ACTIVE")).andExpect(jsonPath("$.category.code").value("COMPUTER"))
                .andReturn();
        String id = json(created, "id");
        mvc.perform(post("/api/v1/assets").with(alice()).contentType(MediaType.APPLICATION_JSON)
                        .header("Idempotency-Key", "create-laptop-0001").content(asset("MacBook Pro", "LAPTOP-1")))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.id").value(id));

        // search
        mvc.perform(get("/api/v1/assets").with(alice()).param("search", "macbook"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalItems").value(1)).andExpect(jsonPath("$.items[0].id").value(id));
        mvc.perform(get("/api/v1/assets").with(alice()).param("categoryId", VEHICLE))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalItems").value(0));

        // read, another user cannot, an auditor can
        mvc.perform(get("/api/v1/assets/" + id).with(alice())).andExpect(status().isOk()).andExpect(header().string("ETag", "\"0\""));
        mvc.perform(get("/api/v1/assets/" + id).with(bob())).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/assets/" + id).with(audrey())).andExpect(status().isOk());

        // update needs If-Match; a stale one is a 409 with details; a good one bumps the ETag
        mvc.perform(put("/api/v1/assets/" + id).with(alice()).contentType(MediaType.APPLICATION_JSON).content(asset("MacBook Pro 14", "LAPTOP-1")))
                .andExpect(status().isPreconditionRequired());
        mvc.perform(put("/api/v1/assets/" + id).with(alice()).header("If-Match", "\"5\"").contentType(MediaType.APPLICATION_JSON)
                        .content(asset("MacBook Pro 14", "LAPTOP-1")))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.type").value("https://assetcare.janaka.me/problems/stale-version"))
                .andExpect(jsonPath("$.currentVersion").value(0)).andExpect(jsonPath("$.changedBy").exists()).andExpect(jsonPath("$.requestId").exists());
        mvc.perform(put("/api/v1/assets/" + id).with(alice()).header("If-Match", "\"0\"").contentType(MediaType.APPLICATION_JSON)
                        .content(asset("MacBook Pro 14", "LAPTOP-1")))
                .andExpect(status().isOk()).andExpect(header().string("ETag", "\"1\"")).andExpect(jsonPath("$.name").value("MacBook Pro 14"));
        mvc.perform(put("/api/v1/assets/" + id).with(audrey()).header("If-Match", "\"1\"").contentType(MediaType.APPLICATION_JSON)
                        .content(asset("x", "LAPTOP-1")))
                .andExpect(status().isForbidden());

        // validation errors are Problem Details with field errors
        mvc.perform(post("/api/v1/assets").with(alice()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"\",\"categoryId\":\"" + COMPUTER + "\",\"currency\":\"CHFX\"}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors", hasSize(2)));

        // maintenance: plan, list with urgency, complete with a service record, recurring successor appears
        MvcResult item = mvc.perform(post("/api/v1/assets/" + id + "/maintenance").with(alice()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"INSPECTION\",\"description\":\"Battery check\",\"dueDate\":\"2026-10-01\",\"recurrence\":\"P1Y\"}"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.urgency").value("PLANNED")).andReturn();
        String itemId = json(item, "id");
        mvc.perform(post("/api/v1/maintenance/" + itemId + "/complete").with(alice()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"performedOn\":\"2026-09-16\",\"summary\":\"Battery at 91%\",\"cost\":0,\"currency\":\"CHF\"}"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.maintenanceItemId").value(itemId));
        mvc.perform(get("/api/v1/assets/" + id + "/maintenance").with(alice()))
                .andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[?(@.status=='DONE')]").exists()).andExpect(jsonPath("$[?(@.dueDate=='2027-10-01')]").exists());
        mvc.perform(get("/api/v1/assets/" + id + "/service-records").with(audrey())).andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(1)));

        // attachment: upload to filesystem storage, list, download, wrong type rejected
        mvc.perform(multipart("/api/v1/assets/" + id + "/attachments").file(new MockMultipartFile("file", "receipt.pdf", "application/pdf", "%PDF-1.4 test".getBytes())).with(alice()))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.fileName").value("receipt.pdf")).andExpect(jsonPath("$.sha256").isNotEmpty());
        mvc.perform(multipart("/api/v1/assets/" + id + "/attachments").file(new MockMultipartFile("file", "x.exe", "application/x-msdownload", "MZ".getBytes())).with(alice()))
                .andExpect(status().isBadRequest());
        MvcResult list = mvc.perform(get("/api/v1/assets/" + id + "/attachments").with(alice())).andExpect(status().isOk()).andReturn();
        String attachmentId = list.getResponse().getContentAsString().replaceAll(".*\"id\":\"([^\"]+)\".*", "$1");
        mvc.perform(get("/api/v1/attachments/" + attachmentId + "/content").with(alice()))
                .andExpect(status().isOk()).andExpect(header().string("Content-Disposition", org.hamcrest.Matchers.containsString("attachment")));

        // history: create, update, attach, in newest-first order, readable by the auditor
        mvc.perform(get("/api/v1/assets/" + id + "/history").with(audrey()))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].operation").value("ATTACH"))
                .andExpect(jsonPath("$[1].operation").value("UPDATE")).andExpect(jsonPath("$[1].changedFields.name.to").value("MacBook Pro 14"))
                .andExpect(jsonPath("$[2].operation").value("CREATE")).andExpect(jsonPath("$[2].requestId").exists());

        // archive (DELETE) hides it from the list, keeps it readable, restore is admin only
        mvc.perform(delete("/api/v1/assets/" + id).with(alice())).andExpect(status().isNoContent());
        mvc.perform(get("/api/v1/assets").with(alice())).andExpect(jsonPath("$.totalItems").value(0));
        mvc.perform(get("/api/v1/assets").with(alice()).param("includeArchived", "true")).andExpect(jsonPath("$.totalItems").value(1));
        mvc.perform(get("/api/v1/assets/" + id).with(alice())).andExpect(jsonPath("$.status").value("ARCHIVED"));
        mvc.perform(post("/api/v1/assets/" + id + "/restore").with(alice())).andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/assets/" + id + "/restore").with(admin())).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("ACTIVE"));

        // dashboard and me
        mvc.perform(get("/api/v1/dashboard").with(alice())).andExpect(status().isOk()).andExpect(jsonPath("$.assets").value(1))
                .andExpect(jsonPath("$.warrantyEndingSoon", hasSize(0)));
        mvc.perform(get("/api/v1/me").with(alice())).andExpect(jsonPath("$.displayName").value("alice")).andExpect(jsonPath("$.roles[0]").value("USER"));
    }

    @Test
    void statusTransitionsAndAdminCategories() throws Exception {
        String id = json(mvc.perform(post("/api/v1/assets").with(bob()).contentType(MediaType.APPLICATION_JSON).content(asset("Phone", "PHONE-1")))
                .andExpect(status().isCreated()).andReturn(), "id");
        mvc.perform(patch("/api/v1/assets/" + id + "/status").with(bob()).header("If-Match", "\"0\"").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"IN_REPAIR\"}")).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("IN_REPAIR"));
        mvc.perform(patch("/api/v1/assets/" + id + "/status").with(bob()).header("If-Match", "\"1\"").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"ARCHIVED\"}")).andExpect(status().isConflict());
        mvc.perform(post("/api/v1/categories").with(bob()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"DRONE\",\"name\":\"Drone\",\"sortOrder\":55,\"active\":true}")).andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/categories").with(admin()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"DRONE\",\"name\":\"Drone\",\"sortOrder\":55,\"active\":true}")).andExpect(status().isCreated());
        mvc.perform(get("/api/v1/categories").with(audrey())).andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(8)));
        mvc.perform(get("/api/v1/assets/" + UUID.randomUUID()).with(admin())).andExpect(status().isNotFound())
                .andExpect(jsonPath("$.type").value("https://assetcare.janaka.me/problems/not-found"));
    }

    private static String json(MvcResult r, String field) throws Exception {
        var body = r.getResponse().getContentAsString();
        var m = java.util.regex.Pattern.compile("\"" + field + "\":\"([^\"]+)\"").matcher(body);
        assertThat(m.find()).as("field %s in %s", field, body).isTrue();
        return m.group(1);
    }
}
