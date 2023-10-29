---
title: "A Tripartite Framework of Reasoning"
---

What constitutes being intelligent? Is it being able to recall facts or tidbits of information with perfect recall? Or being able to dissect the statements and logic on another to prove their inferiority? Maybe intelligence is just being able to read a stack-trace properly. But perhaps, intelligence is to be measured by the efficacy of one's _hunch_.

If accuracy in hunches is how we will measure intelligence, as opposed to; memorization efficiency or the ability to final logical inconsistencies -- then the wielding of intelligence is the making of correct guesses. Guessing on the basis of information is _inferring_ something, that is to infer is to make an educated guess -- the folks at Oxford's English Dictionary phrase it as:

> to infer is to decide that something is true based on the basis of the information that is available.

Inference may not comprise _all_ of intelligence, but making correct guesses about the world is no small part of Systems that have intelligence. For those interested in Natural or Artificial intelligence, we might wonder how inference gets implemented -- in the accepted canon of Logic, inferences are progressive conclusions arrived at via reasoning. In Logic, since the days of Aristotle (300 BCE), inference has been divided into _deductive_ and _inductive_ reasoning. Thanks to one interesting fellow in the 1800s, Charles Sanders Peirce (CSP), a third method dubbed _abductive_ reasoning joined the fray and the three methods are frameworks of reasoning that one could use to implement intelligence. Let us explore the existing implementations of intelligence via reasoning and take a speculative foray into potential avenues for new implementations.

![Homunculus](/assets/images/misc/dwarf_in_the_flask.png)

## One Mad Lad

The trichotomy view of reasoning methods is attributable CSP, who was something of an American Diogenes of Logic. He lived an interesting life, starting in 1842 as the son of Benjamin Peirce (Founder of the Harvard Mathematics department) -- CSP was quite intellectually gifted and also did rather poorly in school (failing in most classes sans Chemistry). He lived a Diogenes-esque existence in that he decided at age [20](https://plato.stanford.edu/entries/peirce/#:~:text=In%20his%20youth,der%20Logik.) that he would dedicate his life to the study of Logic, a field which at the time had no money available for one to make a living conducting abstract logic research. He held true to his promise to himself and was able to pump out a whopping 92,000 pages over about 57 years and 2 marriages. His second marriage followed the 1st's divorce by 2 days and was to a woman with at least some Romani (Gypsy) ancestry, which sadly cost him his job as a Mathematics professor at John Hopkins University. He had a falling out with his academic career and later his career as a Geodetic Surveyor (measuring/studying the Earth's gravity via pendulums) after funding was canceled and didn't live very cushy-ily throughout his life.

For this mad lad though, that wasn't necessarily a problem, since his objective was Logic-ing and he did brilliantly within that. He also believed that clustering was the most effective solution for all classification tasks, had an odd affinity for the number 3 and distilled a [lovely rendition of the scientific method](https://www.appstate.edu/~steelekm/classes/psy3100/Documents/Scientific_Thinking.pdf) into logical reasoning that we should all brush up on before attempting anything worth being called science.

## Methods of Reasoning

Before we think about the implementations of reasoning in AI, lets walk through the distinguishing features of our frameworks.

**Deductive Reasoning** involves making truthful statements about "truth". Under a deductive framework we can make "correct" statements -- insofar as correct means in accordance with our prior knowledge. To deductively reason is to deduce a conclusion based on the attributes of the involved objects we are reasoning about. The main example used to explain deduction is the [Syllogism](https://en.wikipedia.org/wiki/Syllogism) which is typically represented as a 3 line argument:

- All Cats are Evil
- A Cat is the Supreme Leader of the World
- The Supreme Leader is Evil

The essence of the deductive inference is taking two things you hold to be true and combining their mutual information to make a third, "true", statement.

**Inductive Reasoning** involves applying information you have on hand or gained from experience to new observations. This method underpins basically all of modern machine learning & work in AI. To make an inductive inference, one needs to have prior information and then make a prediction based on that information. [Inductive reasoning](https://my.parker.edu/ICS/icsfs/INDUCTIVE_REASONING.htm?target=d0c9ff98-b316-423f-8e3f-947763e4f28c#:~:text=The%20classical%20example%20used%20to,of%20us%20are%20still%20around!), as it relates to the malevolence of cats might look like:

- 99/100 Cats I have come across are Evil
- I see a New Cat
- This New Cat is likely Evil

The main idea of inductive inference is using prior knowledge to predict what may occur in the future.

**Abductive Reasoning** involves coming up with a likely possible explanation for a phenomena given the information you have available to you. This is sort of a combination of deduction and induction in that you leverage your current "context" to justify a statement that you believe is "true". One example of drawing an [abductive conclusion](https://plato.stanford.edu/entries/abduction/#AbdGenIde) might be:

- There are feathers in a birdcage with the door broken off it's hinge
- There is a shallow mark on the windowsill and the window is ajar
- A Cat did not eat the Bird, instead the Bird freed itself

The main idea of abductive inference is choosing the best possible conclusion given the current context. The conclusion chosen may _contradict_ the likelihood of observed data or your prior beliefs about the world, but it is the best hunch of the bunch.

## Reasoning in "AI"

- explain how AI has evolved from deductive to inductive methods
  AI became regarded as a proper field in the ~1950s, a lovely mixture of ideas from the fields of; Mathematics, Psychology, Engineering & Computer Science and the minds of great folks like; Turing, Shannon, Minsky & Gödel. Early AI was mainly concerned with _Deductive Reasoning_, the reasoning behind this was the pioneers of the field presumed that if you could bake in a lot of knowledge about the world into a Computer then it could reason about that knowledge with Superhuman speed and efficiency -- making it a superhuman intelligence. One big project today that is still forging in the deductive way is [Cyc](https://cyc.com/), which has been spearheaded by Doug Lenat since the 1980s. Deductive systems can reason about things they know to be "true" in a superhuman fashion, so why do we not have AGI or hear much about new deductive breakthroughs in AI? The issue with deductive reasoning is fundamental to the paradigm itself. Deductive systems can only make statements about that which they already know, in other words, statements about new information are _irreconcilable_. Deductive reasoning relies on rules about the attributes of objects to make statements, when a new/unseen object arises or a contradictory-example is provided then our deductive system is out. The veracity of a deductive system is only as salient as the quality of the truth baked into the rules of the system by Humans, which itself will not be infallible. Trying to give a deduction-based system the "keys to it's own knowledge base" goes poorly, since updating a single statement to be contradictory then renders all statements in the system to be fallible (one error in reasoning opens the floodgates to all errors). Reasoning deductively can be mathematically/provably sound but the truth of the statement in the real world is governed it's priors, priors which, in the case of deductive reasoning, cannot be updated without human intervention.

Today we hear very little about deductive methods, instead there is an unyielding dredge of Arxiv papers all leveraging inductive reasoning. The basis of which is learning to infer from existing data. The addition of induction to the set of AI building blocks opens the door to systems that _learn over time_ and when we cleverly combine this framework with compute & the data available on the internet we can create GPT-3s, and Stable Diffusions. The caveat with Neural Networks or learning to infer based on the statistics of occurring data is threefold; one we are never certain about what the next instance will be, two we have no theory as to why the data occurs in the manner it does and three the distribution underpinning life is non-stationary. The 1st might just be a [causal inference problem])(https://blog.evjang.com/2019/03/causal-rl.html), which to solve requires more comprehensive data but then again it might not be. The second is also problematic since we do not care about the _why_ of anything, purely inductive inference only cares about the number of positive N and negative N, taking the observations we come across as being the true ground truth. Belief in observation without contemplation can be problematic, as [Bertrand Russell's Turkey.](https://mashimo.wordpress.com/2013/03/12/bertrand-russells-inductivist-turkey/) illustrates. The third is perhaps the most perplexing of all since inductive reasoning systems in the environment of reality will always be behind, they can update themselves (a big step up from deduction) but the full solution to intelligence, it is not.

## Where is the Abduction?

If I had to guess as to how Abduction is to be implemented, I would wager that you do something like deduction over learned hypothesis probabilities. Effectively combining the truthy-ness of statements made deductively with the update-ability of induction. Some folks have formulated abductive reasoning as a [next token prediction sort of task](https://arxiv.org/pdf/1908.05739.pdf) which might be sufficient but still misses a dedicated architecture for accomplishing this specific type of reasoning. To build the [Ghost in the Flask](https://en.wikipedia.org/wiki/Homunculus) we have to at minimum match Human intelligence and Humans can have pretty good hunches. Hunches that are non-obvious or even counter intuitive to the existing information.

As a callback to the "Inference Game" that started this post, intelligence is not about having all relevant information or sorting through a large amount of information, it is about using leveraging the available information correctly. If you also want to find out what implemented Abduction looks like, [say hi](https://tonkatsu.io/about/).

​

## Notes

- This post was largely inspired by [Erik J. Larson](https://en.wikipedia.org/wiki/Erik_J._Larson)'s book, "[The Myth of Artificial Intelligence](https://www.amazon.com/Myth-Artificial-Intelligence-Computers-Think/dp/0674983513)", which is a phenomenal read and unique take on AI as it stands today.
- Despite all the cool stuff LLMs can do (as of Q1 2023) I think Larson's points are still valid. I would wager AGI is not going to be achieved by predicting the next byte-pair with a 100 trillion parameter model.
