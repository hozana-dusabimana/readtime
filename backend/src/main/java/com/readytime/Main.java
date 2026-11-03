package com.readytime;

import com.readytime.service.AdminService;
import com.readytime.service.AppointmentService;
import com.readytime.service.AuthService;
import com.readytime.service.BusinessService;
import com.readytime.service.CatalogService;
import com.readytime.web.ApiRoutes;
import com.readytime.web.Router;
import com.sun.net.httpserver.HttpServer;

import java.net.InetSocketAddress;
import java.util.concurrent.Executors;

/** Starts ReadyTime: connects to the database, creates the tables and starts the web server. */
public class Main {

    public static void main(String[] args) throws Exception {
        Config config = new Config("config.properties");
        Database db = new Database(config.dbUrl(), config.dbUser(), config.dbPassword());
        db.createTables();

        TimeProvider time = TimeProvider.system();
        AuthService auth = new AuthService(db, time);
        AdminService admin = new AdminService(db, auth);
        BusinessService business = new BusinessService(db, auth);
        CatalogService catalog = new CatalogService(db, time);
        AppointmentService appointments = new AppointmentService(db, time);

        auth.createFirstSystemAdmin("admin@readytime.com", "Admin@1234");

        Router router = new Router(auth, config.corsOrigin());
        ApiRoutes.register(router, auth, admin, business, catalog, appointments);

        // The backend only answers API requests with JSON. The frontend is a separate website.
        HttpServer server = HttpServer.create(new InetSocketAddress(config.port()), 0);
        server.createContext("/", router);
        // Several threads, so several users (e.g. two clients booking at once) are served at the same time.
        server.setExecutor(Executors.newFixedThreadPool(16));
        server.start();

        System.out.println("ReadyTime API is running: http://localhost:" + config.port() + "/api");
    }
}
