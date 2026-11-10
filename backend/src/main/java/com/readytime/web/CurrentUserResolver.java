package com.readytime.web;

import com.readytime.AppException;
import com.readytime.model.User;
import com.readytime.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.MethodParameter;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

/** Fills "@CurrentUser User me" from the header "Authorization: Bearer <token>". */
@Component
public class CurrentUserResolver implements HandlerMethodArgumentResolver {

    private final AuthService authService;

    public CurrentUserResolver(AuthService authService) {
        this.authService = authService;
    }

    @Override
    public boolean supportsParameter(MethodParameter parameter) {
        return parameter.hasParameterAnnotation(CurrentUser.class) && parameter.getParameterType() == User.class;
    }

    @Override
    public User resolveArgument(MethodParameter parameter, ModelAndViewContainer mavContainer,
                                NativeWebRequest webRequest, WebDataBinderFactory binderFactory) {
        User user = authService.findUserByToken(tokenOf(webRequest.getNativeRequest(HttpServletRequest.class)));
        if (user == null) {
            throw new AppException(401, "Please log in first.");
        }
        return user;
    }

    /** The session token is sent in the header "Authorization: Bearer <token>" (by the frontend and by Postman). */
    public static String tokenOf(HttpServletRequest request) {
        String auth = request == null ? null : request.getHeader("Authorization");
        if (auth != null && auth.startsWith("Bearer ")) {
            return auth.substring(7).trim();
        }
        return null;
    }
}
