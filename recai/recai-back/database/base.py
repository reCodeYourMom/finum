from sqlalchemy.ext.declarative import as_declarative

@as_declarative()
class Base:
    id: any
    __name__: str