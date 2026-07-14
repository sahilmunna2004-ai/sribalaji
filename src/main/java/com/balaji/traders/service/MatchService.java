package com.balaji.traders.service;

import com.balaji.traders.model.Farmer;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Service
public class MatchService {

    // Normalize strings (remove diacritics, lower case)
    private String normalize(String s) {
        if (s == null) return "";
        String n = Normalizer.normalize(s, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        return n.toLowerCase(Locale.ROOT).trim();
    }

    // Simple Levenshtein distance
    private int levenshtein(String a, String b) {
        a = normalize(a);
        b = normalize(b);
        int[] costs = new int[b.length() + 1];
        for (int j = 0; j < costs.length; j++) costs[j] = j;
        for (int i = 1; i <= a.length(); i++) {
            costs[0] = i;
            int nw = i - 1;
            for (int j = 1; j <= b.length(); j++) {
                int cj = Math.min(1 + Math.min(costs[j], costs[j - 1]), a.charAt(i - 1) == b.charAt(j - 1) ? nw : nw + 1);
                nw = costs[j];
                costs[j] = cj;
            }
        }
        return costs[b.length()];
    }

    // Normalized similarity 0..1
    private double similarity(String a, String b) {
        if ((a == null || a.isEmpty()) && (b == null || b.isEmpty())) return 1.0;
        if (a == null) a = "";
        if (b == null) b = "";
        String na = normalize(a);
        String nb = normalize(b);
        int max = Math.max(na.length(), nb.length());
        if (max == 0) return 1.0;
        int dist = levenshtein(na, nb);
        double sim = 1.0 - ((double) dist / (double) max);
        if (sim < 0) sim = 0;
        return sim;
    }

    public List<Match> findMatches(Farmer candidate, List<Farmer> existing, double threshold) {
        List<Match> out = new ArrayList<>();
        String target = candidate.getName();
        if (target == null || target.trim().isEmpty()) target = "";
        for (Farmer f : existing) {
            String source = f.getName();
            if (source == null || source.trim().isEmpty()) source = "";
            double score = similarity(target, source);
            if (score >= threshold) {
                out.add(new Match(f.getId(), score, source));
            }
        }
        return out;
    }

    public static class Match {
        private Long id;
        private double score;
        private String source;

        public Match(Long id, double score, String source) {
            this.id = id;
            this.score = score;
            this.source = source;
        }

        public Long getId() { return id; }
        public double getScore() { return score; }
        public String getSource() { return source; }
    }
}
