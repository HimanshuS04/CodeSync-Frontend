import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CommentResponse {
  id: number;
  projectId: string;
  fileId: string;
  authorId: string;
  authorName: string;
  content: string;
  parentCommentId?: number;
  isResolved: boolean;
  createdAt: string;
  updatedAt: string;
  replies: CommentResponse[];
}

@Injectable({
  providedIn: 'root'
})
export class CommentService {
  private baseUrl = environment.apiGatewayUrl;

  constructor(private http: HttpClient) {}

  addComment(data: {
    projectId: string;
    fileId: string;
    content: string;
    authorName: string;
  }): Observable<CommentResponse> {
    return this.http.post<CommentResponse>(
      `${this.baseUrl}/api/comments/add`, data);
  }

  reply(data: {
    parentCommentId: number;
    content: string;
    authorName: string;
  }): Observable<CommentResponse> {
    return this.http.post<CommentResponse>(
      `${this.baseUrl}/api/comments/reply`, data);
  }

  getByFile(fileId: string): Observable<CommentResponse[]> {
    return this.http.get<CommentResponse[]>(
      `${this.baseUrl}/api/comments/file/${fileId}`);
  }

  resolve(commentId: number): Observable<any> {
    return this.http.put(
      `${this.baseUrl}/api/comments/resolve`,
      { commentId });
  }

  unresolve(commentId: number): Observable<any> {
    return this.http.put(
      `${this.baseUrl}/api/comments/unresolve`,
      { commentId });
  }

  deleteComment(commentId: number): Observable<any> {
    return this.http.post(
      `${this.baseUrl}/api/comments/delete`,
      { commentId });
  }

  getCount(fileId: string): Observable<{count: number}> {
    return this.http.get<{count: number}>(
      `${this.baseUrl}/api/comments/count/${fileId}`);
  }
}