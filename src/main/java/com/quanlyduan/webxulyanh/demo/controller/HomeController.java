package com.quanlyduan.webxulyanh.demo.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.ModelAttribute;

import com.quanlyduan.webxulyanh.demo.dto.request.UserRequestDTO;
import com.quanlyduan.webxulyanh.demo.service.UserService;

@Controller
public class HomeController {

    @Autowired
    private UserService userService;

    @Value("${google.client-id:}")
    private String googleClientId;

    @GetMapping("/")
    public String index() {
        return "home/index";
    }

    @GetMapping("/editor")
    public String editor() {
        return "editor/editor";
    }

    @GetMapping("/projects")
    public String projects() {
        return "projects/projects";
    }

    @GetMapping("/profile")
    public String profile() {
        return "profile/profile";
    }

    @GetMapping("/admin")
    public String admin() {
        return "admin/admin";
    }

    @GetMapping("/admin/profile")
    public String adminProfile() {
        return "admin/profile";
    }

    @GetMapping("/explorer")
    public String explorer() {
        return "projects/projects";
    }

    @GetMapping("/admin/login")
    public String adminLogin(Model model) {
        model.addAttribute("googleClientId", googleClientId);
        return "admin/login";
    }

    @GetMapping("/login")
    public String login(Model model) {
        model.addAttribute("googleClientId", googleClientId);
        return "auth/login";
    }

    @GetMapping("/register")
    public String register(Model model) {
        model.addAttribute("googleClientId", googleClientId);
        return "auth/register";
    }

    @GetMapping("/forgot-password")
    public String forgotPassword() {
        return "auth/forgot-password";
    }

    @GetMapping("/reset-password")
    public String resetPassword() {
        return "auth/reset-password";
    }

    @GetMapping("/confirm-email")
    public String confirmEmail(@org.springframework.web.bind.annotation.RequestParam("token") String token) {
        try {
            userService.verifyEmail(token);
            return "redirect:/login?verified=true";
        } catch (Exception e) {
            try {
                return "redirect:/login?verification_error=" + java.net.URLEncoder.encode(e.getMessage(), "UTF-8");
            } catch (Exception ex) {
                return "redirect:/login?verification_error=error";
            }
        }
    }

    @PostMapping("/register")
    public String processRegister(@ModelAttribute UserRequestDTO request) {
        try {
            userService.createUser(request);
            // Đăng ký thành công, chuyển hướng về trang login
            return "redirect:/login?registered=true";
        } catch (Exception e) {
            // Xử lý lỗi
            try {
                return "redirect:/register?error=true&msg=" + java.net.URLEncoder.encode(e.getMessage(), "UTF-8");
            } catch (Exception ex) {
                return "redirect:/register?error=true";
            }
        }
    }
}
