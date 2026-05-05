import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CodeFile {
  fileId: string;
  projectId: string;
  name: string;
  path: string;
  language: string;
  content: string;
  size: number;
  createdAt: string;
  updatedAt: string;
}

export interface FileTreeItem {
  fileId?: string;
  name: string;
  path: string;
  type: string;
  language: string;
  children: FileTreeItem[];
}

@Injectable({
  providedIn: 'root'
})
export class FileService {
  private baseUrl = environment.apiGatewayUrl;

  constructor(private http: HttpClient) {}

  createFile(data: any): Observable<CodeFile> {
    return this.http.post<CodeFile>(
      `${this.baseUrl}/api/files/create`, data);
  }

  getFileById(id: string): Observable<CodeFile> {
    return this.http.get<CodeFile>(
      `${this.baseUrl}/api/files/${id}`);
  }

  getFileTree(projectId: string): Observable<FileTreeItem[]> {
    return this.http.get<FileTreeItem[]>(
      `${this.baseUrl}/api/files/tree/${projectId}`);
  }

  updateContent(fileId: string, content: string): Observable<CodeFile> {
    return this.http.put<CodeFile>(
      `${this.baseUrl}/api/files/content`,
      { fileId, content });
  }

  renameFile(fileId: string, newName: string): Observable<CodeFile> {
    return this.http.put<CodeFile>(
      `${this.baseUrl}/api/files/rename`,
      { fileId, newName });
  }

  deleteFile(fileId: string): Observable<any> {
    return this.http.post(
      `${this.baseUrl}/api/files/delete`,
      { fileId });
  }
  restoreFile(fileId: string): Observable<any> {
    return this.http.post(
      `${this.baseUrl}/api/files/restore`,
      { fileId });
  }
}