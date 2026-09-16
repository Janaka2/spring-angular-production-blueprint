package me.janaka.assetcare;

import org.springframework.boot.SpringApplication;

public class TestAssetcareApiApplication {

	public static void main(String[] args) {
		SpringApplication.from(AssetcareApiApplication::main).with(TestcontainersConfiguration.class).run(args);
	}

}
