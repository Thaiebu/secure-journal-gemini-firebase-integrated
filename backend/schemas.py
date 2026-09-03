from pydantic import BaseModel, Field
from typing import List, Optional, Literal

class ChatMessage(BaseModel):
    id: Optional[str] = Field(default="", max_length=128)
    role: Literal["user", "assistant", "model"] = Field(..., description="Message author role")
    content: str = Field(..., min_length=1, max_length=10000, description="Message content text")
    timestamp: Optional[int] = None

class ChatRequest(BaseModel):
    messages: List[ChatMessage] = Field(..., min_length=1, max_length=50, description="Ordered conversation messages")
    mode: Optional[Literal["reflective", "brainstorm", "actionable", "summary"]] = Field(
        default="reflective", description="Journal reflection conversational style"
    )
    journalContext: Optional[str] = Field(default="", max_length=15000, description="Active reflection body context")

class ChatResponse(BaseModel):
    reply: str
    modelUsed: str
    mode: str

class InsightsRequest(BaseModel):
    title: Optional[str] = Field(default="", max_length=200)
    content: str = Field(..., min_length=3, max_length=20000, description="Journal reflection content")
    mood: Optional[str] = Field(default="General", max_length=50)

class AIInsights(BaseModel):
    summary: str = Field(..., description="2-3 sentence core synthesis")
    keyThemes: List[str] = Field(default_factory=list, description="3-5 thematic tags")
    emotionalTone: str = Field(..., description="Emotional energy assessment")
    takeaways: List[str] = Field(default_factory=list, description="Concrete realizations")
    followUpQuestions: List[str] = Field(default_factory=list, description="Mindful inquiry questions")
    encouragement: str = Field(..., description="Mindful closing affirmation")

class InsightsResponse(BaseModel):
    insights: AIInsights
    modelUsed: str

class SaveSessionRequest(BaseModel):
    journalId: Optional[str] = Field(default=None, max_length=128, description="Target journal document ID")
    title: str = Field(default="Untitled Reflection", max_length=200)
    content: str = Field(..., min_length=1, max_length=30000)
    mood: Optional[str] = Field(default="Reflective", max_length=50)
    tags: Optional[List[str]] = Field(default_factory=list, max_length=20)
    conversation: Optional[List[ChatMessage]] = Field(default_factory=list, max_length=100)
    generateInsights: Optional[bool] = Field(default=True, description="Whether to automatically synthesize insights before persisting")

class SaveSessionResponse(BaseModel):
    status: str
    journalId: str
    path: str
    savedAt: str
    insights: Optional[AIInsights] = None
    modelUsed: Optional[str] = None

class SendOtpRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=254, description="User email address")
    name: Optional[str] = Field(default="", max_length=100, description="User display name")
    mode: Optional[Literal["signup", "signin"]] = Field(default="signup", description="Auth flow mode")

class SendOtpResponse(BaseModel):
    status: str
    message: str
    email: str
    expiresInSeconds: int
    devOtpCode: Optional[str] = None

class VerifyOtpRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=254)
    otp: str = Field(..., min_length=4, max_length=10, description="6-digit verification code")
    name: Optional[str] = Field(default="", max_length=100)

class VerifyOtpResponse(BaseModel):
    status: str
    message: str
    customToken: Optional[str] = None
    uid: str
    email: str
    displayName: Optional[str] = None
    accessLink: str

