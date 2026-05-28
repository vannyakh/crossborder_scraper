from pydantic import BaseModel

from server.schemas.config import AIConfigResponse, LLMHealthResponse


class AgentLlmSetupStep(BaseModel):
    id: str
    label: str
    detail: str = ""
    ok: bool
    optional: bool = False


class AgentLlmGatewaySummary(BaseModel):
    tools_count: int = 0
    skills_count: int = 0
    enabled_skills_count: int = 0
    workflows_count: int = 0
    schedules_count: int = 0
    enabled_schedules_count: int = 0


class AgentLlmSetupResponse(BaseModel):
    config: AIConfigResponse
    health: LLMHealthResponse | None = None
    gateway: AgentLlmGatewaySummary
    steps: list[AgentLlmSetupStep]
    setup_complete: bool = False
    chat_ready: bool = False
