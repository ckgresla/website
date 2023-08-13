---
title: "Bayesian Statistics"
---

I have always found statistics to be pretty cool. The implications of the [Central Limit Theorem (CLT)](https://en.wikipedia.org/wiki/Central_limit_theorem) and being able to conduct hypothesis tests to make truth-y statements about the world is as phenomenal in my opinion as; something existing rather that nothing and backpropagation working as a tool to train neural networks. Statistics is one of the fundamental fields underpinning ML and DL, so it is always nice to keep those foundations strong -- I have always wanted to explore the difference between the Frequentist and Bayesian understandings of statistics and recently spent some time delving into the Bayesian branch. I think there are useful ideas for reasoning about the world in the Bayesian interpretation and hope you find them here.

## Historical Background

The Bayesian school of statistics gets it's name from [Thomas Bayes](https://en.wikipedia.org/wiki/Thomas_Bayes) an English statistician that whipped out [Bayes' Theorem]() at some point in his lifetime, it was presented to the Royal Society in 1763 after his death by [Richard Price](https://en.wikipedia.org/wiki/Richard_Price). The theorem was presented as a solution to the "inverse probability problem", basically the chaps of the 1700s wanted to calculate Posterior Distributions as we do with the Bayesian Theorem today.

[Bayesianism](https://www.oxfordbibliographies.com/view/document/obo-9780195396577/obo-9780195396577-0204.xml) as a school of thought in the more philosophical sense around the 1950s, around the dawn of the modern computer. Bayesian methods have been intertwined with computers and computation since the get go and have been used for AI; [Naïve Bayes](https://digitalcommons.morris.umn.edu/cgi/viewcontent.cgi?article=1024&context=horizons) and [Bayesian Belief Networks](https://www.javatpoint.com/bayesian-belief-network-in-artificial-intelligence) are two methods that leverage Bayes' Theorem to operate.

## Bayesians and Frequentists

Frequentist statistics is the canonical form or interpretation of statistics, it boils down to the idea that the probability of some event, is described by the _frequency_ or _rate_ at which that event occurs. Bayesian statistics however, represents _uncertainties_ in information with probabilities. That might sound like mumbo jumbo so here is an example of the difference in reasoning with the classic coin flip.

- Assume we have a fair coin, for which the Probability of it landing on heads after being tossed is 50% (i.e; \\(P(H)=0.5\\) )
  - **The Frequentists** would interpret this as meaning that 50 out of 100 coin flips should be heads because we expect `Heads` to occur at a rate of 50%, or half the time
  - **The Bayesians** would interpret this as being equally unsure of the outcome for the _next_ coin flip, it could be `Heads` or `Not Heads` with equal likelihood
- For toy problems where we have this sort of frequency of events to work with there isn't an obvious advantage to thinking like a Bayesian, but the Bayesian perspective makes far more sense when we are examining outcomes for which many observations _do not exist_.

Say you hear an odd sound after driving through a construction area and your car veers toward one side. You want to estimate the probability of this behavior being due to a flat tire, since you never have been in this situation before you have no _outcomes to use as prior proabilities_ -- meaning that a frequentist interpretation of this problem is effectively undefined. We can estimate our _belief_ in the probability of the odd behavior being due to a flat tire in a Bayesian sense. This makes the Bayesian framework amenable to more real world problems for which many occurences is not tractable.

## Probability Formals

Probability can be thought of as an extension of Logic; extending logical reasoning from discrete space into continuous.

Logic is all about working with **absolute** beliefs, things in logic are either; True or False, in Discrete states of 0 or 1. A really effective and interesting way to think of probability is that we extend our logical reasoning into "continuous space" whereas traditional logic exists only in a discrete/binary space. This lets us extend the tools of logic into areas that would have previously been undefined or non-traversable.

From a Bayesian perspective; being entirely certain that an outcome will or will not occur is equivalent to traditional logic.

- 1 = 100% certain that the outcome will occur,
- 0 = 100% certain that the outcome will not occur.
  This ability to reason about likelihood of outcomes gets extended in probability, where we can explicitly define the probability of an outcome without _needing_ it to be entirely certain one way or the other.

A slightly biased coin might be have outcome probabilities of P(H)=0.85 and P(T)=0.15, there is not a discrete mapping for each outcome (since always heads or always tails doesn't exist) but we can reason about outcomes in a logical way using these probabilities and statistics.

In Logic we have operators for reasoning, these are \\( \in \lbrace AND, OR, NOT \rbrace \\) and their descriptive natural language counterparts: `Conjunction, Disjunction, Negation` -- which when combined with _True_ data we can reason about the world.
To make the extension into the Probabilistic domain, we need to extend these operators; the mapping of Operators in Logic to their counterparts in Probability depend on whether or not the Probabilistic Operation is **Independent** or **Dependent**.

- For **Independent Probabilities**;
- \\( AND \mapsto P(A) \* P(B) \\) -- (also referred to as the "product of probabilities"), often represented as \\( P(A, B) \\) in notation
- \\( OR \mapsto P(A) \ or \ P(B) = P(A) + P(B) \\) -- (the probability of event A **or** B occuring)
- \\( NOT \mapsto \neg P(A) = 1 - P(A) \; \\) -- (the "**¬**" symbol refers to "the negation of", in this case the negation of the Probability of A is equal to 1-P(A), effectively the probability of **not** A)
- For **Dependent Probabilities**;
- \\( AND \mapsto P(A) \* P(B | A) \; \\) -- this slight difference in the \\( AND \\) operator is noteworthy, as we need to account for the dependence between the variables, the product of the two events happening then becomes the probability of the event we are interested in, A, occuring. Multiplied with the probability of B occuring, GIVEN that A has already occured. (in the independent scenario, there is no conditioning so we can just multiply the probabilities for A and B, technically we do the same thing as the dependent setting but since there is no mutual inclusitivity/dependence we just multiply by the probability of B).
- \\( OR \mapsto P(A) \ or \ P(B) = P(A) + P(B) - P(A, B) \\) -- the subtraction of the \\( P(A, B) \\) term is the only change from the dependent variant, the reason for it is that we have co-occuring variables, because they are dependent on one another we need to factor in the probability of A and B occuring when we want to calculate ther probability of **either** A or B occuring.
- the `not` operation remains the same we use this when dealing with a single variable so it doesn't require factoring any dependence into the definition

Most of reality involves working with Dependent probabilities (mutually inclusive) and Independent Probabilities (mutually exclusive) can be thought of as special cases of the Dependent counterparts (since the formulas for these are simplified from the dependent definition). We use these methods of combining probabilities to extend logic into the probabilistic domain.

## Breakdown of Bayes Theorem

Bayes Theorem is a tool for _reversing conditional probabilities_, that is given the probability of an observation given a belief, \\( P(Observation|Belief) \\) we can quantify our strength in believing the belief, given the observation ( \\( P(Belief | Observation) \\) ). This gets formulated frequently in the world as \\( P(X | y)\\) wherein; \\( X=data \\) and \\( y=label \\). This formulation corresponds to estimating the likelihood of a single instance of data being from class \\( y \\) when conditioned on the observations associated with it, think Spam or Not Spam Email as our classes and the Data being the tokenized words from the email.

Bayes Theorem can be broken down as follows:

- **The Theorem**
  - \\( P(A | B) = \frac{P(A) \* P(B | A)}{P(B)} \\)
- **The Components**
  - \\( P(A|B) \\) -- the Posterior Probability, thing we are interested in calculating (likelihood of observation being from class \\( y \\)
  - \\( P(B | A) \\) -- the Likelihood, is our probability of an observation occuring given our Prior (given class \\(y \\) the likelihood of the observing the data)
  - \\( P(A) \\) -- the Prior Probability, the probability of our Prior occuring (just the data being observed)
  - \\( P(B) \\) -- the Data, this normalizes our calculation (without which we would have unnormalized probabilities)
- **The Terms**; Prior and Belief, can kind of be used interchangably, fundamentally they refer to our background information that when combined with data lets us calculate the probability of the belief being the case (say the probability of fraud occuring given some set of data, this is the prior/belief that we want to estimate a probability of occurence for given some observed data)

#### Unormalized Posterior Comparison of Cakes

- If we forgo the normalization (dividing by likelihood of data) we can still get meaningful insights from comparing two, unormalized, Bayesian Posteriors (doing just the top portion of the theorems' calculation) -- this is done by _comparing the ratios_ to one another, here is an example:
  - **Our Priors**:
  - \\( P(cheesecake) = 0.9 \\)
  - \\( P(angelcake) = 0.12 \\)
  - **Our Likelihoods**:
  - \\( P(cheesecake | GooeyTexture) = 0.8 \\)
  - \\( P(angelcake | GooeyTexture) = 0.03 \\)
  - **Calculation of Unnormalized Posteriors**;
  - \\( P(cheesecake | GooeyTexture) \* P(cheesecake) \approx 0.72 = P(CB) \\) --> belief in eating cheesecake
  - \\( P(angelcake | GooeyTexture) \* P(angelcake) \approx 0.0036 = P(AB) \\) --> belief in eating angelcake
  - **Relative Comparsion**;
  - \\( \frac{P(CB)}{P(AB)} = 0.72/0.0036 = 200 \\) -- meaning the likelihood that we are eating cheesecake, given our data about texture and our priors for what cake we like to eat, is 200x more likely than the likelihood of us eating angelcake given the information.

## Being Less Wrong ~= Intelligence

Human brains seem to have evolved a general "sense" of likelihood. What we do in Day-to-Day life is something like Bayesian statistics, we estimate the likelihood of outcomes in order to influence decisions and all of our beliefs are conditioned on our priors of the world's behavior. The probabilties and actual values that go into our [active inference](http://louiskirsch.com/ai/active-inference) pipeline aren't yet quantifiable in the same way we can parameterize a neural network, but we still think in roughly these terms.

Our understanding of the world at say, timestep \\( t \\), is conditioned on our understanding of the world as we experienced it from \\(t*0 \\) -> \\( t*{t-1} \\) -- or in other words, all of our experience in the world from our first to most recent.

[Bayesian Reasoning](https://www.bayesian-intelligence.com/publications/bai/book/BAI_Chapter1.pdf) is a great way to formalize uncertainty and quantify our beliefs about the world. It has already been used to a fair extent within ML and in some AI Systems but I reckon that the Bayesian framework, as a tool for operating in the world, still has a part to play in building systems that reason how Humans do.
