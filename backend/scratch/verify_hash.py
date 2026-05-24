import bcrypt
h = "$2b$12$xmu6830yLIG6wkZdUFLPMeRrf0gmNOXD2sHGS1jsXkLu04HS.RUmS"
password = "ChangeMe123!"
print(f"Hash: {h}")
print(f"Password: {password}")
result = bcrypt.checkpw(password.encode("utf-8"), h.encode("utf-8"))
print(f"Result: {result}")
