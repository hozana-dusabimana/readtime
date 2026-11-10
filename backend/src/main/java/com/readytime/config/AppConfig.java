package com.readytime.config;

import com.fasterxml.jackson.databind.ser.std.ToStringSerializer;
import com.readytime.TimeProvider;
import com.readytime.web.CurrentUserResolver;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.jackson.Jackson2ObjectMapperBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

/** Web settings: CORS, the logged-in-user parameter, JSON date format and the clock. */
@Configuration
public class AppConfig implements WebMvcConfigurer {

    private final String corsOrigin;
    private final CurrentUserResolver currentUserResolver;

    public AppConfig(@Value("${readytime.cors-origin}") String corsOrigin, CurrentUserResolver currentUserResolver) {
        this.corsOrigin = corsOrigin;
        this.currentUserResolver = currentUserResolver;
    }

    /** The frontend runs on a different address (port 5500), so the browser needs CORS permission. */
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOriginPatterns(corsOrigin)
                .allowedMethods("GET", "POST", "PUT", "OPTIONS")
                .allowedHeaders("Content-Type", "Authorization");
    }

    /** Lets controllers ask for "@CurrentUser User me". */
    @Override
    public void addArgumentResolvers(List<HandlerMethodArgumentResolver> resolvers) {
        resolvers.add(currentUserResolver);
    }

    /** Dates and times are sent as plain text like "2026-11-05T09:30", "2026-11-05" and "09:00". */
    @Bean
    public Jackson2ObjectMapperBuilderCustomizer dateTimeAsText() {
        return builder -> builder
                .serializerByType(LocalDateTime.class, ToStringSerializer.instance)
                .serializerByType(LocalDate.class, ToStringSerializer.instance)
                .serializerByType(LocalTime.class, ToStringSerializer.instance);
    }

    /**
     * The real clock (Africa/Kigali). Tests can create a TimeProvider with a fixed Clock instead.
     * static: the services need it before this configuration class itself is created.
     */
    @Bean
    public static TimeProvider timeProvider() {
        return TimeProvider.system();
    }
}
