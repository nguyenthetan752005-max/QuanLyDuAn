package com.quanlyduan.webxulyanh.demo.security;

import com.quanlyduan.webxulyanh.demo.entity.User;
import com.quanlyduan.webxulyanh.demo.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        User user = userRepository.findByUsername(username)
                .orElseGet(() -> userRepository.findByEmail(username)
                        .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username)));

        String password = user.getPasswordHash() != null ? user.getPasswordHash() : "";

        String role = (user.getRole() != null && !user.getRole().isBlank()) ? user.getRole() : "USER";

        return org.springframework.security.core.userdetails.User
                .withUsername(user.getUsername())
                .password(password)
                .disabled(!user.isEmailVerified())
                .roles(role)
                .build();
    }
}
