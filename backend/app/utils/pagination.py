def paginate(data: list, total: int, limit: int, offset: int) -> dict:
    return {
        "data": data,
        "pagination": {
            "total": total,
            "limit": limit,
            "offset": offset,
            "has_next": (offset + limit) < total,
        },
    }