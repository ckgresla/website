---
title: "Factor Analysis"
---

​

### Simply Put

Factor Analysis refers to statistical methods that reduce Variables in a Dataset to a smaller number of Factors, through Linear Combinations of Correlated Variables or with other dimensionality reduction techniques. It sees most of its use in traditional Statistics.

There are a few types of Factor Analysis methods:

1. [Exploratory Factor Analysis](https://en.wikipedia.org/wiki/Exploratory_factor_analysis) (EFA): make no _a priori_ assumptions about what Variables will decompose into what factors (let the data tell you what combinations of Variables will make good Factors)
   reduce the number of input features
2. [Confirmatory Factor Analysis](https://en.wikipedia.org/wiki/Confirmatory_factor_analysis) (CFA): looks to test a hypothesis on Actual Variables (assuming that some combination of Variables X & B decompose nicely into Factor x̄)
3. Principal Factor Analysis (PFA): aims to get the lowest number of Factors that adequately (user needs to define what adequate is) describes the Variables, this is what most jump to (in ML) when thinking about FA at large. (reduce the number of input features)

These statistical folks differentiate between _Factor Analysis_ and _Factor Extraction_ - basically they hold the idea that a Factor Analysis is a larger-scale operation for examining relationships between features and Factor Extraction is a part of a Factor Analysis. PCA and other Correlation-Based algorithms constitute the Toolkit for Factor Extraction.

### PCA Vs. FA

The main difference between EFA and PCA is a bit of a Definitional or Philosophical one, FA assumes that there are Latent Factors waiting to be uncovered (whether we believe they are a specific combination of Variables or make no such assumption) whereas PCA just determines what Factors explain the variance in the data matrix, not at all making the kind of assumptions that FA does and much more of a method. (technical differences between individual algorithms are non-sensical, since PCA is a method for deriving Factors and therefore a part of the toolkit of Factor Analysis, for debate on this check out the [wiki](<https://en.wikipedia.org/wiki/Factor_analysis#Exploratory_factor_analysis_(EFA)_versus_principal_components_analysis_(PCA)>).

​

### More Info

- https://www.ml-science.com/factor-analysis
- https://www.geeksforgeeks.org/introduction-to-factor-analytics/

​
