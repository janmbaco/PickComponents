export type RegistrationField = "username" | "email" | "password";

export interface FieldValidationRules {
  required?: boolean;
  minlength?: number;
  maxlength?: number;
  pattern?: string;
  title?: string;
}

export type RegistrationFormRules = Partial<
  Record<RegistrationField, FieldValidationRules>
>;

export interface RegistrationFormSession {
  rules: RegistrationFormRules;
}

export class RegistrationFormRulesService {
  async loadSession(): Promise<RegistrationFormSession> {
    return {
      rules: {
        username: {
          required: true,
          minlength: 3,
          maxlength: 20,
          title: "Required. 3 to 20 characters.",
        },
        email: {
          required: true,
          maxlength: 60,
          pattern: "[^\\s@]+@[^\\s@]+\\.[^\\s@]+",
          title: "Required. Use an email like name@domain.com.",
        },
        password: {
          required: true,
          minlength: 8,
          maxlength: 64,
          title: "Required. 8 to 64 characters.",
        },
      },
    };
  }
}
