def success(message: str, data=None) -> dict:
    return {"success": True, "message": message, "data": data}


def error(message: str) -> dict:
    return {"success": False, "message": message, "data": None}