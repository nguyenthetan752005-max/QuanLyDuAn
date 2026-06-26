package com.quanlyduan.webxulyanh.demo.service;

import com.quanlyduan.webxulyanh.demo.dto.request.UserRequestDTO;
import com.quanlyduan.webxulyanh.demo.dto.response.LoginResponseDTO;
import com.quanlyduan.webxulyanh.demo.dto.response.UserResponseDTO;

import java.util.List;

public interface UserService {
    UserResponseDTO createUser(UserRequestDTO request);
    UserResponseDTO getUserById(String id);
    List<UserResponseDTO> getAllUsers();
    UserResponseDTO updateUser(String id, UserRequestDTO request);
    void changePassword(String id, com.quanlyduan.webxulyanh.demo.dto.request.ChangePasswordRequestDTO request);
    void deleteUser(String id);
    LoginResponseDTO loginOrRegisterGoogleUser(String idToken);
    void initiatePasswordReset(String email);
    void resetPassword(String token, String newPassword);
    void verifyEmail(String token);
}
