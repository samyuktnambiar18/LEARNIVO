export {};

declare global {
  interface GoogleCredentialResponse {
    credential: string;
    select_by?: string;
    clientId?: string;
  }

  interface GoogleButtonOptions {
    type?: 'standard' | 'icon';
    theme?: 'outline' | 'filled_blue' | 'filled_black';
    size?: 'large' | 'medium' | 'small';
    text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
    shape?: 'rectangular' | 'pill' | 'circle' | 'square';
    logo_alignment?: 'left' | 'center';
    width?: number | string;
    locale?: string;
    click_listener?: () => void;
  }

  interface GoogleIdConfiguration {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
    context?: 'signin' | 'signup' | 'use';
    ux_mode?: 'popup' | 'redirect';
    login_uri?: string;
  }

  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: GoogleIdConfiguration) => void;
          renderButton: (parent: HTMLElement, options: GoogleButtonOptions) => void;
          prompt: (momentListener?: (promptMoment: any) => void) => void;
          cancel: () => void;
          disableAutoSelect: () => void;
          revoke: (hint: string, callback?: (response: any) => void) => void;
        };
        oauth2?: {
          initTokenClient: (config: any) => { requestAccessToken: (options?: any) => void };
        };
      };
    };
  }
}
