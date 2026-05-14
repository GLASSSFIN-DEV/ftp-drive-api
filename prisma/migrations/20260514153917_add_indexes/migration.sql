-- CreateIndex
CREATE INDEX "Account_dirId_idx" ON "Account"("dirId");

-- CreateIndex
CREATE INDEX "Account_rbacId_idx" ON "Account"("rbacId");

-- CreateIndex
CREATE INDEX "Account_provider_idx" ON "Account"("provider");

-- CreateIndex
CREATE INDEX "Account_recordStatus_idx" ON "Account"("recordStatus");

-- CreateIndex
CREATE INDEX "Account_createdAt_idx" ON "Account"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "Account_username_provider_idx" ON "Account"("username", "provider");

-- CreateIndex
CREATE INDEX "Diretorate_accountId_idx" ON "Diretorate"("accountId");

-- CreateIndex
CREATE INDEX "Diretorate_recordStatus_idx" ON "Diretorate"("recordStatus");

-- CreateIndex
CREATE INDEX "Diretorate_createdAt_idx" ON "Diretorate"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "Diretorate_name_idx" ON "Diretorate"("name");

-- CreateIndex
CREATE INDEX "File_folderId_idx" ON "File"("folderId");

-- CreateIndex
CREATE INDEX "File_accountId_idx" ON "File"("accountId");

-- CreateIndex
CREATE INDEX "File_recordStatus_idx" ON "File"("recordStatus");

-- CreateIndex
CREATE INDEX "File_createdAt_idx" ON "File"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "File_fileHash_idx" ON "File"("fileHash");

-- CreateIndex
CREATE INDEX "File_fileType_idx" ON "File"("fileType");

-- CreateIndex
CREATE INDEX "File_fileName_idx" ON "File"("fileName");

-- CreateIndex
CREATE INDEX "File_folderId_fileName_idx" ON "File"("folderId", "fileName");

-- CreateIndex
CREATE INDEX "File_accountId_folderId_idx" ON "File"("accountId", "folderId");

-- CreateIndex
CREATE INDEX "FileSharing_fileId_idx" ON "FileSharing"("fileId");

-- CreateIndex
CREATE INDEX "FileSharing_accountId_idx" ON "FileSharing"("accountId");

-- CreateIndex
CREATE INDEX "FileSharing_toAccountId_idx" ON "FileSharing"("toAccountId");

-- CreateIndex
CREATE INDEX "FileSharing_generatedLink_idx" ON "FileSharing"("generatedLink");

-- CreateIndex
CREATE INDEX "FileSharing_expiredAt_idx" ON "FileSharing"("expiredAt");

-- CreateIndex
CREATE INDEX "FileSharing_recordStatus_idx" ON "FileSharing"("recordStatus");

-- CreateIndex
CREATE INDEX "Folder_parentId_idx" ON "Folder"("parentId");

-- CreateIndex
CREATE INDEX "Folder_accountId_idx" ON "Folder"("accountId");

-- CreateIndex
CREATE INDEX "Folder_recordStatus_idx" ON "Folder"("recordStatus");

-- CreateIndex
CREATE INDEX "Folder_createdAt_idx" ON "Folder"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "Folder_folderName_idx" ON "Folder"("folderName");

-- CreateIndex
CREATE INDEX "Folder_accountId_parentId_idx" ON "Folder"("accountId", "parentId");

-- CreateIndex
CREATE INDEX "Folder_accountId_folderName_idx" ON "Folder"("accountId", "folderName");

-- CreateIndex
CREATE INDEX "FolderSharing_folderId_idx" ON "FolderSharing"("folderId");

-- CreateIndex
CREATE INDEX "FolderSharing_accountId_idx" ON "FolderSharing"("accountId");

-- CreateIndex
CREATE INDEX "FolderSharing_toAccountId_idx" ON "FolderSharing"("toAccountId");

-- CreateIndex
CREATE INDEX "FolderSharing_generatedLink_idx" ON "FolderSharing"("generatedLink");

-- CreateIndex
CREATE INDEX "FolderSharing_expiredAt_idx" ON "FolderSharing"("expiredAt");

-- CreateIndex
CREATE INDEX "FolderSharing_recordStatus_idx" ON "FolderSharing"("recordStatus");

-- CreateIndex
CREATE INDEX "Option_createdAt_idx" ON "Option"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "Rbac_accountId_idx" ON "Rbac"("accountId");

-- CreateIndex
CREATE INDEX "Rbac_recordStatus_idx" ON "Rbac"("recordStatus");

-- CreateIndex
CREATE INDEX "Rbac_createdAt_idx" ON "Rbac"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "Session_accountId_idx" ON "Session"("accountId");

-- CreateIndex
CREATE INDEX "Session_jwtHash_idx" ON "Session"("jwtHash");

-- CreateIndex
CREATE INDEX "Session_recordStatus_idx" ON "Session"("recordStatus");

-- CreateIndex
CREATE INDEX "Session_createdAt_idx" ON "Session"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "Session_accountId_appCode_idx" ON "Session"("accountId", "appCode");

-- CreateIndex
CREATE INDEX "Submission_accountId_idx" ON "Submission"("accountId");

-- CreateIndex
CREATE INDEX "Submission_actionBy_idx" ON "Submission"("actionBy");

-- CreateIndex
CREATE INDEX "Submission_status_idx" ON "Submission"("status");

-- CreateIndex
CREATE INDEX "Submission_expiredAt_idx" ON "Submission"("expiredAt");

-- CreateIndex
CREATE INDEX "Submission_createdAt_idx" ON "Submission"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "Trace_accountId_idx" ON "Trace"("accountId");

-- CreateIndex
CREATE INDEX "Trace_status_idx" ON "Trace"("status");

-- CreateIndex
CREATE INDEX "Trace_method_idx" ON "Trace"("method");

-- CreateIndex
CREATE INDEX "Trace_createdAt_idx" ON "Trace"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "Trace_url_idx" ON "Trace"("url");

-- CreateIndex
CREATE INDEX "TraceSpan_traceId_idx" ON "TraceSpan"("traceId");

-- CreateIndex
CREATE INDEX "TraceSpan_context_idx" ON "TraceSpan"("context");

-- CreateIndex
CREATE INDEX "TraceSpan_createdAt_idx" ON "TraceSpan"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "TraceSpan_durationMs_idx" ON "TraceSpan"("durationMs");
