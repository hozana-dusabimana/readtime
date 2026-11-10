package com.readytime.web;

import com.readytime.model.Business;
import com.readytime.model.Service;
import com.readytime.model.User;
import com.readytime.model.WorkingHour;
import com.readytime.service.BusinessService;
import com.readytime.service.CatalogService;
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

/** Businesses, their providers, the providers' services and working hours. */
@RestController
@RequestMapping("/api")
public class CatalogController {

    private final BusinessService business;
    private final CatalogService catalog;

    public CatalogController(BusinessService business, CatalogService catalog) {
        this.business = business;
        this.catalog = catalog;
    }

    // ---------- Businesses and providers ----------

    @GetMapping("/businesses")
    public List<Business> listBusinesses(@CurrentUser User me) {
        return business.listBusinesses(me);
    }

    /** Must be logged in ("me" is required even though it is not used). */
    @GetMapping("/businesses/{id}/providers")
    public List<User> listProviders(@CurrentUser User me, @PathVariable int id) {
        return business.listProviders(id);
    }

    // ---------- Services ----------

    @GetMapping("/providers/{id}/services")
    public List<Service> listServices(@CurrentUser User me, @PathVariable int id) {
        return catalog.listServices(me, id);
    }

    @PostMapping("/providers/{id}/services")
    public Service createService(@CurrentUser User me, @PathVariable int id,
                                 @RequestBody Requests.ServiceDetails body) {
        return catalog.createService(me, id, body.name(), body.durationMinutes(), body.price());
    }

    @PutMapping("/services/{id}")
    public Service updateService(@CurrentUser User me, @PathVariable int id,
                                 @RequestBody Requests.ServiceDetails body) {
        return catalog.updateService(me, id, body.name(), body.durationMinutes(), body.price(), body.activeOrTrue());
    }

    // ---------- Working hours ----------

    @GetMapping("/providers/{id}/hours")
    public List<WorkingHour> getHours(@CurrentUser User me, @PathVariable int id) {
        return catalog.getHours(id);
    }

    /** Replaces all working hours. Returns the future bookings that are now outside working hours. */
    @PutMapping("/providers/{id}/hours")
    public Map<String, Object> setHours(@CurrentUser User me, @PathVariable int id, @RequestBody Requests.Hours body) {
        return Map.of("outsideNewHours", catalog.setHours(me, id, body.hours()));
    }
}
