import { Component, OnInit, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup,
         Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule }
  from '@angular/material/form-field';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule }
  from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule }
  from '@angular/material/snack-bar';
import { AuthService }
  from '../../../core/services/auth.service';
import { environment }
  from '../../../../environments/environment';

declare const google: any;

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit {
  form: FormGroup;
  loading = false;
  googleLoading = false;
  hidePassword = true;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar,
    private ngZone: NgZone
  ) {
    this.form = this.fb.group({
      username: ['', [
        Validators.required,
        Validators.pattern('^[a-zA-Z0-9_]{3,20}$')
      ]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [
        Validators.required,
        Validators.minLength(6)
      ]]
    });
  }

  ngOnInit(): void {
    this.initGoogleAuth();
  }

  initGoogleAuth(): void {
    const waitForGoogle = setInterval(() => {
      if (typeof google !== 'undefined') {
        clearInterval(waitForGoogle);

        google.accounts.id.initialize({
          client_id: environment.googleClientId,
          callback: (response: any) => {
            this.ngZone.run(() => {
              this.handleGoogleResponse(response);
            });
          }
        });

        google.accounts.id.renderButton(
          document.getElementById('google-btn-register'),
          {
            theme: 'filled_black',
            size: 'large',
            width: '100%',
            text: 'signup_with',
            shape: 'rectangular'
          }
        );
      }
    }, 100);
  }

  handleGoogleResponse(response: any): void {
    if (!response.credential) {
      this.snackBar.open(
        'Google signup failed', 'Close',
        { duration: 3000 });
      return;
    }

    this.googleLoading = true;

    this.authService.googleLogin(response.credential)
      .subscribe({
        next: () => {
          this.googleLoading = false;
          this.router.navigate(['/dashboard']);
        },
        error: (err) => {
          this.googleLoading = false;
          this.snackBar.open(
            err.error?.message || 'Google signup failed',
            'Close',
            { duration: 3000 });
        }
      });
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.loading = true;

    this.authService.register(this.form.value).subscribe({
      next: () => {
        this.loading = false;
        this.snackBar.open(
          'Account created!', 'Close',
          { duration: 3000 });
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading = false;
        this.snackBar.open(
          err.error?.message || 'Registration failed',
          'Close',
          { duration: 3000 });
      }
    });
  }
}