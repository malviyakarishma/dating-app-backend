import * as authService from './auth.service.js';

export const register = async (req, res, next) => {
  try {
    const { user } = await authService.registerUser(req.body);
    
    res.status(201).json({
      status: 'success',
      message: 'Verification OTP sent to your email',
      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { user, tokens } = await authService.loginUser(email, password);

    res.status(200).json({
      status: 'success',
      data: {
        user,
        tokens,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const googleAuth = async (req, res, next) => {
  try {
    const { idToken } = req.body;
    const { user, tokens } = await authService.googleSignIn(idToken);

    res.status(200).json({
      status: 'success',
      data: {
        user,
        tokens,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    await authService.logoutUser(refreshToken);

    res.status(200).json({
      status: 'success',
      message: 'Successfully logged out',
    });
  } catch (error) {
    next(error);
  }
};

export const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    const { user, tokens } = await authService.refreshAuthTokens(refreshToken);

    res.status(200).json({
      status: 'success',
      data: {
        user,
        tokens,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    await authService.generateForgotPasswordOtp(email);

    res.status(200).json({
      status: 'success',
      message: 'OTP sent to email successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    await authService.verifyForgotPasswordOtp(email, otp);

    res.status(200).json({
      status: 'success',
      message: 'OTP verified successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    await authService.resetForgotPassword(email, password);

    res.status(200).json({
      status: 'success',
      message: 'Password reset successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const verifyRegistration = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const { user, tokens } = await authService.verifyRegistrationOtp(email, otp);

    res.status(200).json({
      status: 'success',
      data: {
        user,
        tokens,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const resendRegistrationOtp = async (req, res, next) => {
  try {
    const { email } = req.body;
    await authService.resendRegistrationOtp(email);

    res.status(200).json({
      status: 'success',
      message: 'OTP resent to email successfully',
    });
  } catch (error) {
    next(error);
  }
};
