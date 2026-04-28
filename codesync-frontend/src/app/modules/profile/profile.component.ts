import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule }
  from '@angular/material/snack-bar';
import { NavbarComponent }
  from '../../shared/components/navbar/navbar.component';
import { AuthService }
  from '../../core/services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatSnackBarModule,
    NavbarComponent
  ],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
  profile: any = null;
  loading = true;

  // Edit profile
  editMode = false;
  editUsername = '';
  editEmail = '';
  savingProfile = false;

  // Change password
  showPasswordForm = false;
  oldPassword = '';
  newPassword = '';
  confirmPassword = '';
  changingPassword = false;

  constructor(
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.loading = true;
    this.authService.getProfile().subscribe({
      next: (user) => {
        this.profile = user;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  startEdit(): void {
    this.editMode = true;
    this.editUsername = this.profile.username;
    this.editEmail = this.profile.email;
    this.cdr.detectChanges();
  }

  cancelEdit(): void {
    this.editMode = false;
    this.cdr.detectChanges();
  }

  saveProfile(): void {
    if (!this.editUsername.trim()) return;
    this.savingProfile = true;

    this.authService.updateProfile({
      username: this.editUsername.trim(),
      email: this.editEmail.trim()
    }).subscribe({
      next: (updated) => {
        this.profile = updated;
        this.editMode = false;
        this.savingProfile = false;
        this.snackBar.open('Profile updated!', 'Close',
          { duration: 2000 });
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.savingProfile = false;
        this.snackBar.open(
          err.error?.message || 'Update failed',
          'Close', { duration: 3000 });
        this.cdr.detectChanges();
      }
    });
  }

  togglePasswordForm(): void {
    this.showPasswordForm = !this.showPasswordForm;
    this.oldPassword = '';
    this.newPassword = '';
    this.confirmPassword = '';
    this.cdr.detectChanges();
  }

  changePassword(): void {
    if (!this.oldPassword || !this.newPassword) return;

    if (this.newPassword !== this.confirmPassword) {
      this.snackBar.open(
        'Passwords do not match', 'Close',
        { duration: 3000 });
      return;
    }

    if (this.newPassword.length < 6) {
      this.snackBar.open(
        'Password must be at least 6 characters',
        'Close', { duration: 3000 });
      return;
    }

    this.changingPassword = true;

    this.authService.changePassword({
      oldPassword: this.oldPassword,
      newPassword: this.newPassword
    }).subscribe({
      next: () => {
        this.changingPassword = false;
        this.showPasswordForm = false;
        this.oldPassword = '';
        this.newPassword = '';
        this.confirmPassword = '';
        this.snackBar.open(
          'Password changed!', 'Close',
          { duration: 2000 });
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.changingPassword = false;
        this.snackBar.open(
          err.error?.message || 'Failed',
          'Close', { duration: 3000 });
        this.cdr.detectChanges();
      }
    });
  }

  getTimeAgo(date: string): string {
    return new Date(date).toLocaleDateString(
      'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
  }
}