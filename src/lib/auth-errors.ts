const AUTH_ERROR_MAP: Record<string, string> = {
  "Invalid login credentials": "Incorrect email or password. Please try again.",
  "Email not confirmed": "Please confirm your email before logging in. Check your inbox.",
  "User already registered": "An account with this email already exists. Try logging in instead.",
  "Password should be at least 6 characters": "Password must be at least 6 characters.",
  "Signup requires a valid password": "Please enter a valid password.",
  "Unable to validate email address: invalid format": "Please enter a valid email address.",
};

export function friendlyAuthError(message: string): string {
  return AUTH_ERROR_MAP[message] ?? message;
}
