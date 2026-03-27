package com.tdabac.service;

import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private final JavaMailSender emailSender;

    public EmailService(JavaMailSender emailSender) {
        this.emailSender = emailSender;
    }

    public void sendShareInvitation(String toAddress, String fileHash, String shareLink) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(toAddress);
        message.setSubject("A file has been shared with you on TD-ABAC Vault");
        message.setText("Hello,\n\n"
                + "A time-decaying file has been shared with you on the TD-ABAC Vault blockchain.\n\n"
                + "File Hash: " + fileHash + "\n\n"
                + "You can access the file by clicking the link below:\n"
                + shareLink + "\n\n"
                + "Note: If you do not have an account yet, please register on the website to access the file.\n\n"
                + "Regards,\n"
                + "TD-ABAC Team");
        emailSender.send(message);
    }
}
