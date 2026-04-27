import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface SnapshotResponse {
  id: number;
  projectId: string;
  fileId: string;
  authorId: string;
  message: string;
  hash: string;
  parentId?: number;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class VersionService {
  private baseUrl = environment.apiGatewayUrl;

  constructor(private http: HttpClient) {}

  createSnapshot(data: {
    projectId: string;
    fileId: string;
    message: string;
    content: string;
  }): Observable<SnapshotResponse> {
    return this.http.post<SnapshotResponse>(
      `${this.baseUrl}/api/versions/snapshot`, data);
  }

  getFileHistory(fileId: string): Observable<SnapshotResponse[]> {
    return this.http.get<SnapshotResponse[]>(
      `${this.baseUrl}/api/versions/file/${fileId}`);
  }

  getSnapshotById(id: number): Observable<SnapshotResponse> {
    return this.http.get<SnapshotResponse>(
      `${this.baseUrl}/api/versions/${id}`);
  }

  restoreSnapshot(snapshotId: number): Observable<SnapshotResponse> {
    return this.http.post<SnapshotResponse>(
      `${this.baseUrl}/api/versions/restore`,
      { snapshotId });
  }
}