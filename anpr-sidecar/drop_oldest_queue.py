"""
Thread-safe drop-oldest / LIFO frame queue (maxsize=1).
Capture workers put the newest frame; inference always pulls real-time.
If AI is busy and a new frame arrives, the old unhandled frame is dropped immediately.
(ANPR-ZERO-LATENCY-DROP-TRACK-FLUSH-V1 — confirmed; do not grow this queue.)
"""
from __future__ import annotations

import queue
import threading
from typing import Any, Optional


class DropOldestQueue:
    """queue.Queue(maxsize=1) with get_nowait drop before put (strict LIFO slot)."""

    def __init__(self) -> None:
        self._q: queue.Queue = queue.Queue(maxsize=1)
        self._lock = threading.Lock()

    def put_latest(self, item: Any) -> None:
        with self._lock:
            if self._q.full():
                try:
                    self._q.get_nowait()  # Drop oldest frame immediately
                except queue.Empty:
                    pass
            try:
                self._q.put_nowait(item)
            except queue.Full:
                try:
                    self._q.get_nowait()
                except queue.Empty:
                    pass
                try:
                    self._q.put_nowait(item)
                except queue.Full:
                    pass

    def get_latest(self, *, timeout: Optional[float] = None) -> Any:
        if timeout is None:
            return self._q.get()
        return self._q.get(timeout=timeout)

    def get_nowait(self) -> Any:
        return self._q.get_nowait()

    def empty(self) -> bool:
        return self._q.empty()

    def qsize(self) -> int:
        return self._q.qsize()


# Process-wide live ingest queues keyed by camera / stream id
_queues: dict[str, DropOldestQueue] = {}
_queues_lock = threading.Lock()


def live_queue_for(stream_id: str) -> DropOldestQueue:
    key = str(stream_id or "default").strip() or "default"
    with _queues_lock:
        q = _queues.get(key)
        if q is None:
            q = DropOldestQueue()
            _queues[key] = q
        return q


def put_live_frame(stream_id: str, frame: Any) -> None:
    live_queue_for(stream_id).put_latest(frame)


def take_live_frame(stream_id: str, *, timeout: Optional[float] = 0.05) -> Any:
    q = live_queue_for(stream_id)
    try:
        if timeout is not None and timeout <= 0:
            return q.get_nowait()
        return q.get_latest(timeout=timeout)
    except queue.Empty:
        return None
