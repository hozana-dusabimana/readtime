package com.readytime.web;

import com.readytime.model.User;
import com.readytime.service.AuthService;
import com.readytime.web.dto.Requests;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/** Sign-up, login, logout and "My Profile". */
@RestController
@RequestMapping("/api")
public class AuthController {

    static final Map<String, Boolean> OK = Map.of("ok", true);

    private final AuthService auth;

    public AuthController(AuthService auth) {
        this.auth = auth;
    }

    /** Public sign-up for clients (no login needed). */
    @PostMapping("/register")
    public User register(@RequestBody Requests.Register body) {
        return auth.register(body.fullName(), body.email(), body.password());
    }

    /** A service provider signs up together with their business (name + address). */
    @PostMapping("/register/provider")
    public User registerProvider(@RequestBody Requests.RegisterProvider body) {
        return auth.registerProvider(body.fullName(), body.email(), body.password(),
                body.businessName(), body.businessAddress());
    }

    /**
     * Returns {"token": "...", "user": {...}}. The frontend keeps the token and sends it
     * back with every request in the header "Authorization: Bearer <token>".
     */
    @PostMapping("/login")
    public AuthService.LoginResult login(@RequestBody Requests.Login body) {
        return auth.login(body.email(), body.password());
    }

    @PostMapping("/logout")
    public Map<String, Boolean> logout(HttpServletRequest request) {
        auth.logout(CurrentUserResolver.tokenOf(request));
        return OK;
    }

    @GetMapping("/me")
    public User me(@CurrentUser User me) {
        return me;
    }

    @PutMapping("/me")
    public User updateProfile(@CurrentUser User me, @RequestBody Requests.Profile body) {
        return auth.updateProfile(me, body.fullName(), body.email());
    }

    @PutMapping("/me/password")
    public Map<String, Boolean> changePassword(@CurrentUser User me, @RequestBody Requests.ChangePassword body) {
        auth.changePassword(me, body.currentPassword(), body.newPassword());
        return OK;
    }
}
