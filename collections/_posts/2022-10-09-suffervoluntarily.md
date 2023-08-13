---
title: "Why Voluntary Suffering is Worth it"
---

​

#### Context

I have spent the last few weeks immersing myself in the [Policy Optimization Literature](https://github.com/ckgresla/MI6/blob/main/intel/policy_gradients.md), within the larger field of [Reinforcement Learning](https://en.wikipedia.org/wiki/Reinforcement_learning). This branch of Machine Learning has always been my "fancy", of the main fields in ML, RL is the most "gangster". This affinity for the field of figuring out how to create Agents that can learn things more closely to the way that humans learn is what has prompted me to wake up a little extra early each day; diving into papers and programming before the hitting the gym and before the main work day.

These past 2-ish weeks have been spent trying to implement the VPG, basically what was done in [Sutton's paper from 2000](https://proceedings.neurips.cc/paper/1999/file/464d828b85b0bed98e80ade0a5c43b0f-Paper.pdf) with the addition of generalized advantage estimation ([see section 4](http://joschu.net/docs/thesis.pdf)) a method for reducing variance of the Policy Gradient (effectively the "error" we want to backprop to our Policy Network parameters for learning).

​

#### Just Sit With it

The math behind the Generalized Advantage Estimate (GAE) calculation isn't all that bad, Schulman (who is just brilliant) breaks everything down nicely in his thesis, the intuition for GAE is also a nice one; basically we want to train our Policy Network based on not all of the Reward signals but only the reward signals that come from Actions that do _better than expected_. It doesn't sound all that bad and the only difference from my prior implmentation of REINFORCE is just; the introduction a Value Function estimator (second network that is trained to predict reward given states) and calculating advantage estimates for backprop in the Policy Network.

Sounds trivial, right?

It actually is trivial! But **never** underestimate your ability to be an absolute nincompoop!

This problem really haunted me, it was one of those kinds of things where you understand it conceptually but looking at other implementations throws off your understanding and you get caught in this loop of trying to get it to work but then second guessing your understanding and reviewing the papers and math and blah blah blah. Everyone person that does difficult things occasionally finds themself in the "spinning of the wheels", that lovely place amongst the mud, nonsense and the sense that they should stop being; [stupid, weak, a loser, dumb, lazy, etc.] and just get it done. In these times even though you do step away and let the problem marinate you just gotta sit with the problem. Progress is still made even if code/whatever your metric of performance isn't being increased. The mere **act** of **enduring the muck** increases your skills. Being stubborn and hitting your head against the wall or continously attempting to climb the plateau after falling is the way through. It sucks yea, and all that comes with sucking generally sucks; but the thing to remember is that it'll pass, and with each blow you take, you also get **STRONGER**.

So just sit with the problem, don't run the same function wondering why it doesn't work (or at least try to refrain from doing it < 3 times before thinking about the error) -- the answer will come in due time, you can think of it as your Unconscious Self _updating the gradient_.

​

#### Lots of Ecstatic Yelling & Some Jumping

After weeks of this debauchery, I sat down this lovely Autumn Sunday to do battle yet again with this. I spent the better part of an afternoon implementing GAE in my VPG with no luck.

- I tried the discounted cumsum trick, grads didn't get tracked correctly
- I tried to do the compute with vectors as opposed to elementwise, issues with the discount cumsum calculation
- I tried to do everything elementwise, Tensor has no attribute "backwards()"

...

....

.....

......

WHAT DO YOU MEAN TENSOR HAS NO ATTRIBUTE BACKWARDS!

THE THING HAS A DIRECT LINE OF COMPUTATIONAL BACK TO THE PI NETWORK!

ugh

\* ctrl+c, ctrl+v, enter, click stackoverflow \*

wait... no

\* checks torch documentation \*

no no no no no

\* changes call from loss.backwards() to loss.backward() \*

oh god.

\* switches tmux windows and runs the vpg file \*

\* it starts learning, and learning fast \*

YO KJHGFAKJSDL HFKLSDHFJESIOUEARH ARE YOU F\*\*\*ING SERIOSANJDKSHF SDAEJFGIOUWERHTWEHAFJSDKJHF KJAHFJSEK

\* happiness \*

It is good to remember that you are and have the capacity to be a real idiot -- it is useful to assume this is the true State as it keeps you from being to arrogant and in the pursuit of knowledge.

It is also good, perhaps better, to remember that if you take the time to suffer voluntarily, doing something challenging, you are awesome.
