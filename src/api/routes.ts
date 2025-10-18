export const APIRoutes = {
  GetAgents: (agentOSUrl: string) => `${agentOSUrl}/agents`,
  AgentRun: (agentOSUrl: string) => `${agentOSUrl}/agents/{agent_id}/runs`,
  Status: (agentOSUrl: string) => `${agentOSUrl}/health`,
  GetSessions: (agentOSUrl: string) => `${agentOSUrl}/sessions`,
  GetSessionRuns: (agentOSUrl: string, sessionId: string) =>
    `${agentOSUrl}/sessions/${sessionId}/runs`,

  GetSession: (agentOSUrl: string, sessionId: string) =>
    `${agentOSUrl}/sessions/${sessionId}`,

  DeleteSession: (agentOSUrl: string, sessionId: string) =>
    `${agentOSUrl}/sessions/${sessionId}`,

  GetTeams: (agentOSUrl: string) => `${agentOSUrl}/teams`,
  TeamRun: (agentOSUrl: string, teamId: string) =>
    `${agentOSUrl}/teams/${teamId}/runs`,
  DeleteTeamSession: (agentOSUrl: string, teamId: string, sessionId: string) =>
    `${agentOSUrl}/v1//teams/${teamId}/sessions/${sessionId}`,

  // Agno Knowledge API Routes
  Knowledge: {
    ListContent: (baseUrl: string) => `${baseUrl}/knowledge/content`,
    GetContentById: (baseUrl: string, contentId: string) => `${baseUrl}/knowledge/content/${contentId}`,
    GetContentStatus: (baseUrl: string, contentId: string) => `${baseUrl}/knowledge/content/${contentId}/status`,
    UploadContent: (baseUrl: string) => `${baseUrl}/knowledge/content`,
    UpdateContent: (baseUrl: string, contentId: string) => `${baseUrl}/knowledge/content/${contentId}`,
    DeleteAllContent: (baseUrl: string) => `${baseUrl}/knowledge/content`,
    DeleteContentById: (baseUrl: string, contentId: string) => `${baseUrl}/knowledge/content/${contentId}`
  },

  // Workflow API Routes
  Workflows: {
    ListWorkflows: (baseUrl: string, db_id?: string | null) => `${baseUrl}/workflows`,
    ExecuteWorkflow: (baseUrl: string, workflowId: string) => `${baseUrl}/workflows/${workflowId}/runs`
  }
}
