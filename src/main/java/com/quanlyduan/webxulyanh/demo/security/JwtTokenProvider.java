package com.quanlyduan.webxulyanh.demo.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.util.Date;
import java.util.function.Function;

@Component
public class JwtTokenProvider {

    // 256-bit secret key encoded in Base64
    @Value("${jwt.secret:YW50aWdyYXZpdHlQcm9qZWN0TWFuYWdlbWVudFNlY3JldEtleTIwMjZTZWN1cmVTdHJpbmdXaXRoTW9yZVRoYW4yNTZCaXRzIQ==}")
    private String secretKey;

    @Value("${jwt.expiration:900000}") // 15 minutes in ms
    private long defaultJwtExpirationInMs;

    @Value("${jwt.refreshExpiration:604800000}") // 7 days in ms
    private long defaultJwtRefreshExpirationInMs;

    @org.springframework.beans.factory.annotation.Autowired
    private com.quanlyduan.webxulyanh.demo.service.SystemSettingService systemSettingService;

    private Key getSigningKey() {
        byte[] keyBytes = Decoders.BASE64.decode(secretKey);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    private long getExpiration() {
        return systemSettingService.getSettingByKey("jwt_expiration_ms")
                .map(setting -> Long.parseLong(setting.getSettingValue()))
                .orElse(defaultJwtExpirationInMs);
    }

    private long getRefreshExpiration() {
        return systemSettingService.getSettingByKey("jwt_refresh_expiration_ms")
                .map(setting -> Long.parseLong(setting.getSettingValue()))
                .orElse(defaultJwtRefreshExpirationInMs);
    }

    public String generateToken(Authentication authentication) {
        UserDetails userPrincipal = (UserDetails) authentication.getPrincipal();
        return generateToken(userPrincipal.getUsername());
    }

    public String generateToken(String username) {
        return Jwts.builder()
                .setSubject(username)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + getExpiration()))
                .signWith(getSigningKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    public String generateRefreshToken(String username) {
        return Jwts.builder()
                .setSubject(username)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + getRefreshExpiration()))
                .signWith(getSigningKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    public String getUsernameFromToken(String token) {
        return getClaimFromToken(token, Claims::getSubject);
    }

    public Date getExpirationDateFromToken(String token) {
        return getClaimFromToken(token, Claims::getExpiration);
    }

    public <T> T getClaimFromToken(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = getAllClaimsFromToken(token);
        return claimsResolver.apply(claims);
    }

    private Claims getAllClaimsFromToken(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    private Boolean isTokenExpired(String token) {
        final Date expiration = getExpirationDateFromToken(token);
        return expiration.before(new Date());
    }

    public boolean validateToken(String token, UserDetails userDetails) {
        final String username = getUsernameFromToken(token);
        return (username.equals(userDetails.getUsername()) && !isTokenExpired(token));
    }
}
