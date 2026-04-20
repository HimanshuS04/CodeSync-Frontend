import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup,
         Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MatDialogModule }
  from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule }
  from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule }
  from '@angular/material/snack-bar';
import { ProjectService }
  from '../../../core/services/project.service';

@Component({
  selector: 'app-create-project',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatIconModule,
    MatSnackBarModule
  ],
  templateUrl: './create-project.component.html',
  styleUrls: ['./create-project.component.scss']
})
export class CreateProjectComponent {
  form: FormGroup;
  loading = false;

  languages = [
    'Python', 'JavaScript', 'TypeScript',
    'Java', 'C', 'C++','C#', 'Go',
    'Rust', 'PHP', 'Ruby'
  ];

  constructor(
    private fb: FormBuilder,
    private projectService: ProjectService,
    private dialogRef: MatDialogRef<CreateProjectComponent>,
    private snackBar: MatSnackBar
  ) {
    this.form = this.fb.group({
      name: ['', [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(100)
      ]],
      description: [''],
      language: ['', Validators.required],
      visibility: ['PUBLIC', Validators.required]
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.loading = true;

    this.projectService.createProject(
      this.form.value).subscribe({
        next: (project) => {
          this.loading = false;
          this.snackBar.open(
            'Project created!', 'Close',
            { duration: 3000 });
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.loading = false;
          this.snackBar.open(
            err.error?.message || 'Failed to create project',
            'Close', { duration: 3000 });
        }
      });
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}