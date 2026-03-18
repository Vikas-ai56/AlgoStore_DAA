from fastapi import FastAPI, Query, Path, Body, Request
import time
from pydantic import BaseModel, Field
from typing import Literal, Annotated

app = FastAPI()

@app.get("/")
async def root():
    # Give an intro to the project if needed
    return {"message": "MelodyCloud \n this is a audio storage platform which stores etc etc"}

@app.get("/upload")
async def upload(file_object:str):
    # call the function to upload
    return {"detail":f"Just return the file {file_object} is being uploaded"}






class Item(BaseModel):
    name: str
    description: str | None = None
    price: float
    tax: float | None = None

fake_items_db = [{"item_name": "Foo"}, {"item_name": "Bar"}, {"item_name": "Baz"}]



class FilterParams(BaseModel):
    limit: int = Field(100, gt=0, le=100)
    offset: int = Field(0, ge=0)
    order_by: Literal["created_at", "updated_at"] = "created_at"
    tags: list[str] = []


@app.get("/items/")
async def read_items(filter_query: Annotated[FilterParams, Query()]):
    return filter_query

@app.get("/events/")
async def trigger_event(event_name:str=None):
    return {"Current event" : event_name}

@app.get("/fakeDB/")
async def read_item(item: Item):
    return item

@app.put("/nitems/{item_id}")
async def update_item(
    *,
    item_id: int,
    item: Annotated[
        Item,
        Body(
            openapi_examples={
                "normal": {
                    "summary": "A normal example",
                    "description": "A **normal** item works correctly.",
                    "value": {
                        "name": "Foo",
                        "description": "A very nice Item",
                        "price": 35.4,
                        "tax": 3.2,
                    },
                },
                "converted": {
                    "summary": "An example with converted data",
                    "description": "FastAPI can convert price `strings` to actual `numbers` automatically",
                    "value": {
                        "name": "Bar",
                        "price": "35.4",
                    },
                },
                "invalid": {
                    "summary": "Invalid data is rejected with an error",
                    "value": {
                        "name": "Baz",
                        "price": "thirty five point four",
                    },
                },
            },
        ),
    ],
):
    results = {"item_id": item_id, "item": item}
    return results


@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.perf_counter()
    response = await call_next(request)
    process_time = time.perf_counter() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    return response