package com.readytime.web;

import com.readytime.model.Business;
import com.readytime.model.User;
import com.readytime.service.AdminService;
import com.readytime.web.dto.Requests;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/** Platform management for the system admin. The role check happens in AdminService. */
@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AdminService admin;

    public AdminController(AdminService admin) {
        this.admin = admin;
    }

    // ---------- Users ----------

    @GetMapping("/users")
    public List<User> listUsers(@CurrentUser User me) {
        return admin.listUsers(me);
    }

    @PostMapping("/users")
    public User createUser(@CurrentUser User me, @RequestBody Requests.CreateUser body) {
        return admin.createUser(me, body.fullName(), body.email(), body.password(), body.role(), body.businessId());
    }

    @PutMapping("/users/{id}")
    public User updateUser(@CurrentUser User me, @PathVariable int id, @RequestBody Requests.UpdateUser body) {
        return admin.updateUser(me, id, body.fullName(), body.email(), body.businessId(), body.newPassword());
    }

    @PostMapping("/users/{id}/unblock")
    public Map<String, Boolean> unblock(@CurrentUser User me, @PathVariable int id) {
        admin.unblockClient(me, id);
        return AuthController.OK;
    }

    @PostMapping("/users/{id}/active")
    public Map<String, Boolean> setUserActive(@CurrentUser User me, @PathVariable int id,
                                              @RequestBody(required = false) Requests.Active body) {
        admin.setUserActive(me, id, body == null || body.activeOrTrue());
        return AuthController.OK;
    }

    // ---------- Businesses ----------

    @PostMapping("/businesses")
    public Business createBusiness(@CurrentUser User me, @RequestBody Requests.BusinessDetails body) {
        return admin.createBusiness(me, body.name(), body.address());
    }

    @PutMapping("/businesses/{id}")
    public Business updateBusiness(@CurrentUser User me, @PathVariable int id,
                                   @RequestBody Requests.BusinessDetails body) {
        return admin.updateBusiness(me, id, body.name(), body.address());
    }

    @PostMapping("/businesses/{id}/active")
    public Map<String, Boolean> setBusinessActive(@CurrentUser User me, @PathVariable int id,
                                                  @RequestBody(required = false) Requests.Active body) {
        admin.setBusinessActive(me, id, body == null || body.activeOrTrue());
        return AuthController.OK;
    }

    /** The system admin adds a service provider to a business. */
    @PostMapping("/businesses/{id}/providers")
    public User createProvider(@CurrentUser User me, @PathVariable int id, @RequestBody Requests.Register body) {
        return admin.createProvider(me, id, body.fullName(), body.email(), body.password());
    }
}
