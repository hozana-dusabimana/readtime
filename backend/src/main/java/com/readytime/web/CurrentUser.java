package com.readytime.web;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Marks a controller parameter that receives the logged-in user:
 *
 *   public List<Appointment> list(@CurrentUser User me) { ... }
 *
 * If nobody is logged in, the request is answered with 401 "Please log in first."
 */
@Target(ElementType.PARAMETER)
@Retention(RetentionPolicy.RUNTIME)
public @interface CurrentUser {
}
