package me.janaka.assetcare.architecture;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;
import static com.tngtech.archunit.library.Architectures.layeredArchitecture;

import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;

/**
 * The dependency direction from docs/architecture/ARCHITECTURE.md, as a failing build rather than a convention.
 */
@AnalyzeClasses(packages = "me.janaka.assetcare", importOptions = ImportOption.DoNotIncludeTests.class)
class ArchitectureTest {

    @ArchTest
    static final ArchRule domainDependsOnlyOnTheJdkAndPersistenceAnnotations = classes()
            .that().resideInAPackage("..domain..")
            .should().onlyDependOnClassesThat().resideInAnyPackage(
                    "..domain..", "java..", "jakarta.persistence..", "jakarta.validation..",
                    "org.jspecify.annotations..", "org.hibernate.annotations..", "org.hibernate.type..")
            .because("business rules must not depend on Spring, HTTP, PostgreSQL, Keycloak or the cloud (ADR-011)");

    @ArchTest
    static final ArchRule applicationDoesNotDependOnAdaptersOrWeb = noClasses()
            .that().resideInAPackage("..application..")
            .should().dependOnClassesThat().resideInAnyPackage(
                    "..adapter..", "..infrastructure..", "..configuration..",
                    "org.springframework.web..", "org.springframework.data.jpa..", "jakarta.servlet..")
            .because("use cases talk to ports, never to controllers, JPA or servlets")
            .allowEmptyShould(true);

    @ArchTest
    static final ArchRule layers = layeredArchitecture().consideringOnlyDependenciesInLayers()
            .layer("Domain").definedBy("..domain..")
            .layer("Application").definedBy("..application..")
            .layer("WebAdapter").definedBy("..adapter.in..")
            .layer("OutAdapter").definedBy("..adapter.out..")
            .layer("Infrastructure").definedBy("..infrastructure..", "..configuration..")
            .whereLayer("WebAdapter").mayOnlyBeAccessedByLayers("Infrastructure")
            .whereLayer("OutAdapter").mayOnlyBeAccessedByLayers("Infrastructure")
            .whereLayer("Application").mayOnlyBeAccessedByLayers("WebAdapter", "OutAdapter", "Infrastructure")
            .whereLayer("Domain").mayOnlyBeAccessedByLayers("Application", "WebAdapter", "OutAdapter", "Infrastructure")
            .allowEmptyShould(true);

    @ArchTest
    static final ArchRule noFieldInjection = noClasses()
            .should().dependOnClassesThat().haveFullyQualifiedName("org.springframework.beans.factory.annotation.Autowired")
            .because("constructor injection only (docs/CODING-STANDARDS.md)");
}
