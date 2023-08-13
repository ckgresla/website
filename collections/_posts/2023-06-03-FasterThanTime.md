---
title: "Waiting 10 Seconds in 1"
---

The journey of the programmer is one of ever-humbling discovery. Along this lovely trek you will experience a multitude of paradigm shifts, each of which shattering your prior conception of programming and making you a more effective programmer. For the early-stage python programmer one such paradigm shift is the one you experience when you develop the intuition for parallel programming, which for me only came when I made use of [asyncio](https://docs.python.org/3/library/asyncio.html).

The example problem that shifted my programming-view was a toy one, waiting for some number of seconds. Let us say we want to wait for 10 seconds. A straightforward python program for this may look as follows:

```{python}
import time

def wait(n_seconds: int):
    time.sleep(n_seconds)
    print("slept for {N}".format(N=n_seconds))


if __name__ == "__main__":
    st = time.monotonic()
    wait(10) #wait for our 10 seconds
    et = time.monotonic()
    print(f"whole script ran in {et-st:.2f}s")
```

```
# Outputs
slept for 10
whole script ran in 10.00s
```

In this formulation, we do the waiting in a single function call for the specified amount of time -- 10 seconds. This is a fine and dandy way of waiting, but what if we wanted to wait FASTER? Well since in this case there is no dependency on _how_ we wait for 10 seconds, only that we wait for that amount of time, we can wait _concurrently_.

This means that instead of doing all of our waiting in a single function call, `wait()` in the above, we may split up the "waiting" across different function calls. The following illustrates how we may split up our 10 seconds of waiting across 2 functions with `asnycio`:

```{python}
import time
import asyncio

async def wait(n_seconds: int):
    await asyncio.sleep(n_seconds)
    print(f"slept for {n_seconds}")

async def main():
    jobs = [asyncio.create_task(wait(5)) for i in range(2)]
    await asyncio.gather(*jobs)


if __name__ == "__main__":
    st = time.monotonic()
    asyncio.run(main())
    et = time.monotonic()
    print(f"whole script ran in {et-st:.2f}s")
```

```
# Outputs
slept for 5
slept for 5
whole script ran in 5.01s
```

That is 10 seconds of work being done in 5! This is trivial but for the fresh pair of eyes this concept is a Universe away from what the serial programmer is familiar with. What we do instead of waiting for all 10 seconds in one function is split up the 10 seconds of waiting into "jobs" that each wait for N seconds, in this case we set each "job" to wait for 5, resulting in waiting for 10 seconds in only 5 seconds of human time.

Setting our `range` to `10` and the number of seconds per job to `1` results in the following output for the script above:

```
# Outputs
slept for 1
slept for 1
slept for 1
slept for 1
slept for 1
slept for 1
slept for 1
slept for 1
slept for 1
slept for 1
whole script ran in 1.00s
```

As we can see, one can wait 10 seconds in 1, very cool!

In practice you can use this for any "work" that is not bound by process -- making an HTTP request, applying a tokenizer to a chunk of text data, etc. `Asyncio` as a library is tailored towards parallelizing IO bound operations, which means `asyncio` is best suited for splitting up work that does not need to wait for other work to be done.

## Recommended Readings

- [Dr. Jason Brownlee, doing what he does](https://superfastpython.com/python-asyncio/)
- [Real Python Intro](https://realpython.com/async-io-python/)
