package com.balaji.traders.service;

import com.balaji.traders.model.Farmer;
import com.balaji.traders.repository.FarmerRepository;
import com.balaji.traders.repository.TransactionRepository;
import com.balaji.traders.repository.NotebookPageRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import javax.mail.internet.MimeMessage;
import java.io.File;
import java.io.FileOutputStream;
import java.nio.file.Files;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class BackupService {

    @Autowired
    private FarmerRepository farmerRepository;

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private NotebookPageRepository notebookPageRepository;

    @Autowired(required = false)
    private JavaMailSender mailSender;

    private ObjectMapper mapper = new ObjectMapper();

    // Run once a day at 03:00
    @Scheduled(cron = "0 0 3 * * *")
    public void dailyBackup() {
        try {
            performBackup();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public void performBackup() throws Exception {
        List<Farmer> farmers = farmerRepository.findAll();
        List<?> tx = transactionRepository.findAll();
        List<?> pages = notebookPageRepository.findAll();

        Map<String,Object> dump = new HashMap<>();
        dump.put("farmers", farmers);
        dump.put("transactions", tx);
        dump.put("notebooks", pages);

        String filename = "backup-" + LocalDate.now().toString() + ".json";
        File file = new File("data/backups");
        if (!file.exists()) file.mkdirs();
        File out = new File(file, filename);
        try (FileOutputStream fos = new FileOutputStream(out)) {
            fos.write(mapper.writerWithDefaultPrettyPrinter().writeValueAsBytes(dump));
        }

        // Send email if mailSender available and env BACKUP_TO set
        String to = System.getenv("BACKUP_TO");
        if (mailSender != null && to != null && !to.isEmpty()) {
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, true);
            helper.setTo(to);
            helper.setSubject("Daily Backup " + LocalDate.now().toString());
            helper.setText("Attached backup");
            helper.addAttachment(filename, out);
            mailSender.send(msg);
        }
    }
}
