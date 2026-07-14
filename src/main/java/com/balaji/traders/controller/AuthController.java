package com.balaji.traders.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import javax.servlet.http.HttpServletRequest;
import java.io.BufferedReader;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    @Value("${app.security.username}")
    private String adminUsername;

    @Value("${app.security.password}")
    private String adminPassword;

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(
            @RequestParam(required = false) String username,
            @RequestParam(required = false) String password,
            HttpServletRequest request) throws IOException {
        
        // If no form params, try to parse JSON body
        if ((username == null || username.isEmpty()) && (password == null || password.isEmpty())) {
            String contentType = request.getContentType();
            if (contentType != null && contentType.contains("application/json")) {
                try {
                    BufferedReader reader = request.getReader();
                    StringBuilder jsonBody = new StringBuilder();
                    String line;
                    while ((line = reader.readLine()) != null) {
                        jsonBody.append(line);
                    }
                    if (jsonBody.length() > 0) {
                        // Simple JSON parsing for username and password
                        String json = jsonBody.toString();
                        username = extractJsonValue(json, "username");
                        password = extractJsonValue(json, "password");
                    }
                } catch (Exception e) {
                    System.err.println("Failed to parse JSON body: " + e.getMessage());
                }
            }
        }
        
        String normalizedUsername = username == null ? null : username.trim();
        String normalizedPassword = password == null ? null : password.trim();

        Map<String, Object> response = new HashMap<>();
        if (adminUsername.equals(normalizedUsername) && adminPassword.equals(normalizedPassword)) {
            response.put("success", true);
            response.put("message", "Login successful");
            response.put("token", "balaji-session-token-mock");
            return ResponseEntity.ok(response);
        } else {
            response.put("success", false);
            response.put("message", "Invalid username or password");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        }
    }

    private String extractJsonValue(String json, String key) {
        String searchKey = "\"" + key + "\":";
        int keyIndex = json.indexOf(searchKey);
        if (keyIndex == -1) {
            return "";
        }
        int valueStart = keyIndex + searchKey.length();
        // Skip whitespace
        while (valueStart < json.length() && Character.isWhitespace(json.charAt(valueStart))) {
            valueStart++;
        }
        // Expect a quote
        if (valueStart < json.length() && json.charAt(valueStart) == '"') {
            valueStart++;
            int valueEnd = json.indexOf('"', valueStart);
            if (valueEnd != -1) {
                return json.substring(valueStart, valueEnd);
            }
        }
        return "";
    }
}
