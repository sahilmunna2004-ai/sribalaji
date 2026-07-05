package com.balaji.traders;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class UiIntegrationTests {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void indexPageServedAndContainsFarmersUiElements() throws Exception {
        mockMvc.perform(get("/"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith("text/html"))
                .andExpect(result -> {
                    String body = result.getResponse().getContentAsString();
                    assertTrue(body.contains("farmers-table-toolbar"), "Expected Farmer toolbar markup in index page");
                    assertTrue(body.contains("Add Farmer"), "Expected Add Farmer button text in index page");
                    assertTrue(body.contains("id=\"farmers-list\""), "Expected Farmer list table markup in index page");
                });
    }
}
