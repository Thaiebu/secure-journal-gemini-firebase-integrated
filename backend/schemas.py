from pydantic import BaseModel, Field
from typing import List, Optional, Literal, Any

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

class SignUpRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="User full name")
    email: str = Field(..., min_length=3, max_length=254, description="User email address")
    password: str = Field(..., min_length=6, max_length=128, description="Account password (min 6 chars)")

class SignInRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=254, description="User email address")
    password: str = Field(..., min_length=1, max_length=128, description="Account password")

class AuthResponse(BaseModel):
    status: str
    message: str
    uid: str
    email: str
    displayName: Optional[str] = None
    customToken: Optional[str] = None
    admin: bool = False
    role: str = "user"

class JournalLocation(BaseModel):
    name: Optional[str] = Field(default="Pinned Spot", max_length=150)
    address: Optional[str] = Field(default=None, max_length=250)
    lat: Optional[float] = Field(default=0.0)
    lng: Optional[float] = Field(default=0.0)
    placeId: Optional[str] = Field(default=None, max_length=200)
    formattedAddress: Optional[str] = Field(default=None, max_length=250)

class CreateJournalRequest(BaseModel):
    title: Optional[str] = Field(default="Untitled Reflection", max_length=300)
    content: str = Field(..., min_length=1, max_length=50000, description="Journal reflection text")
    mood: Optional[str] = Field(default="Reflective", max_length=50)
    tags: Optional[List[str]] = Field(default_factory=list, max_length=20)
    conversation: Optional[List[ChatMessage]] = Field(default_factory=list, max_length=100)
    generateInsights: Optional[bool] = Field(default=True)
    location: Optional[JournalLocation] = None
    pinned: Optional[bool] = False
    journalId: Optional[str] = Field(default=None, max_length=128)
    createdAt: Optional[Any] = None

