from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import students, staff, appointments, auth, users
from app import models

from app.routers import session_ai
from dotenv import load_dotenv
load_dotenv()


app = FastAPI(
    title="PsyUnit API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(students.router)
app.include_router(staff.router)
app.include_router(appointments.router)
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(session_ai.router)

@app.get("/")
async def root():
    return {"message": "PsyUnit API is running"}
