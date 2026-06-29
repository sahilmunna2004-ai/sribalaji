package com.balaji.traders.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/calculator")
@CrossOrigin(origins = "*")
public class InterestCalculatorController {

    @PostMapping("/calculate")
    public ResponseEntity<Map<String, Object>> calculateInterest(@RequestBody Map<String, Object> params) {
        try {
            double principal = Double.parseDouble(params.get("principal").toString());
            double rate = Double.parseDouble(params.get("rate").toString());
            String rateType = params.get("rateType").toString(); // "MONTHLY" or "YEARLY"
            LocalDate startDate = LocalDate.parse(params.get("startDate").toString());
            LocalDate endDate = LocalDate.parse(params.get("endDate").toString());
            String compounding = params.get("compounding").toString(); // "SIMPLE", "MONTHLY", "YEARLY"

            long days = ChronoUnit.DAYS.between(startDate, endDate);
            if (days < 0) {
                Map<String, Object> err = new HashMap<>();
                err.put("error", "End date must be after start date");
                return ResponseEntity.badRequest().body(err);
            }

            double years = days / 365.25;
            double months = days / 30.4375; // Average days in a month

            double interest = 0.0;
            
            // Adjust rate to monthly or yearly decimal
            double decimalRate = rate / 100.0;

            if ("SIMPLE".equalsIgnoreCase(compounding)) {
                if ("MONTHLY".equalsIgnoreCase(rateType)) {
                    interest = principal * decimalRate * months;
                } else {
                    interest = principal * decimalRate * years;
                }
            } else if ("MONTHLY".equalsIgnoreCase(compounding)) {
                // If rate is yearly, convert to monthly rate
                double r = "YEARLY".equalsIgnoreCase(rateType) ? decimalRate / 12.0 : decimalRate;
                interest = principal * Math.pow(1.0 + r, months) - principal;
            } else if ("YEARLY".equalsIgnoreCase(compounding)) {
                // If rate is monthly, convert to yearly rate (compounded or simple)
                double r = "MONTHLY".equalsIgnoreCase(rateType) ? decimalRate * 12.0 : decimalRate;
                interest = principal * Math.pow(1.0 + r, years) - principal;
            }

            // Round to 2 decimal places
            interest = Math.round(interest * 100.0) / 100.0;
            double totalAmount = Math.round((principal + interest) * 100.0) / 100.0;

            Map<String, Object> result = new HashMap<>();
            result.put("days", days);
            result.put("months", Math.round(months * 100.0) / 100.0);
            result.put("years", Math.round(years * 100.0) / 100.0);
            result.put("interest", interest);
            result.put("totalAmount", totalAmount);

            return ResponseEntity.ok(result);
        } catch (Exception e) {
            Map<String, Object> err = new HashMap<>();
            err.put("error", "Invalid inputs: " + e.getMessage());
            return ResponseEntity.badRequest().body(err);
        }
    }
}
