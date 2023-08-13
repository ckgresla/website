---
title: "Two Hot Encodings"
---

Anyone who has gotten their feet wet with Data Science or Classical Machine Learning has come across the concept of [One-Hot Encoding](https://machinelearningmastery.com/why-one-hot-encode-data-in-machine-learning/). A method of representing non-ordered Categorical data as a vector of zeros and a single one. One-hot encoding is a part of the accepted canon of ML, and is a common step in pre-processing data pipelines.
Recently, I had the unexpected luxury of coming across the [Mastering Diverse Domains through World Models](https://arxiv.org/pdf/2301.04104v1.pdf) paper and in it, was introduced to _Two-hot encoding_, an interesting generalization of one-hot encoding to continuous values. In this work the authors use two-hot encoding as part of the Critic network's (critic being ~equal to a reward prediction network in their [Actor-Critic](http://www.incompleteideas.net/book/ebook/node66.html) formulation) loss function. After normalizing rewards across domains with the Symlog transformation, they apply two-hot encoding to _discretize_ reward signals -- turning what was a continuous regression problem into Softmax over a binned reward distribution. In my opinion, this simple trick is GANGSTER + worth implementing.

## One-Hot Encoding

The typical flow for one-hot encoding looks something like this;

- We have a categorical feature (think column of data in a Table or Excel Spreadsheet), say "Beverage"
- That feature has a number of unique values, like: [old fashioned, coffee, makgeolli, water, lychee juice]
- To more easily mathematize this data for our Linear Algebraic friends, we encode with integers, for one-hot encoding that means an unordered encoding
  - Which boils down to, "old fashioned" is no better or worse than "lychee juice" -- it is just _different_, which means encoding these variables as 1 and 2 implies a relationship that is not technically valid (the thing encoded as 2 is "greater than" the thing encoded as 1)

For this toy beverage example, a native python implementation might look something like follows:

```python
unique_beverages = ["old fashioned", "coffee", "makgeolli", "water", "lychee juice"]

def one_hot_encode(x: str):
    """ One-Hot Encode a beverage name according to the unique beverages set """
    idx = unique_beverages.index(x)
    encoded = [] #empty list for the vals
    for i in range(len(unique_beverages)):
        if i == idx:
            encoded.append(1)
        else:
            encoded.append(0)
    return encoded
```

Which for `makgeolli`, would return the vector `[0, 0, 1, 0, 0]` -- all values being zero except for the position corresponding to our instance's categorical value, which is one.

## Two-Hot Encoding

To generalize one-hot encoding, we need to discretize a continuous space. Something like "tastiness" might be scored on an infinite scale -- mid items like lukewarm chicken soup having tastiness=0.01 and tastier items like chicken nanban having tastiness=102.3

- To Discretize a continuous space, we _bin_ it, here I will do equidistant bins, but there might be some value in non-equidistance (really tasty things are all one bin, but moderately tasty and tasty are two separate bins)
- For the sake of this example, say the space of continuous tastiness values will be split into 5 bins

```python
two_hot_bins = [-5, -1, 0, 1, 5] #5 in this toy case

def two_hot_encode(x: float):
    """ Two-Hot Encode a tastiness score, assuming a sorted list of bins """
    encoded = [0 for i in range(5)]

    # Find Lower Bin Index for our x value
    for i in range(len(two_hot_bins)):
        if (two_hot_bins[i] <= x) and (two_hot_bins[i+1] >= x):
            b_lower, b_upper = two_hot_bins[i], two_hot_bins[i+1] #bins encircling our continuous value
            bl_idx, bu_idx = i, i+1
            # Calculate Distances from x to nearest bins, closer ~= higher "probability"
            lower_dist = x - b_lower
            upper_dist = b_upper - x #since negative dist
            total_dist = lower_dist + upper_dist
            lower_prob, upper_prob = lower_dist/total_dist, upper_dist/total_dist

            encoded[bl_idx], encoded[bu_idx] = upper_prob, lower_prob #assign closest val highest "prob"

        # Smaller than Smallest bin value
        elif two_hot_bins[0] > x:
            encoded[0] = 1

        # Greater than Largest bin value
        elif two_hot_bins[-1] < x:
            encoded[-1] = 1

    return encoded
```

Which for a tastiness value of 0.1, would return the vector `[0, 0, 0.9, 0.1, 0]`, for a tastiness value of 1.2 would return a rounded `[0, 0, 0, 0.95, 0.049]` and for the value -1231 (probably tastiness of oysters) would return `[1, 0, 0, 0, 0]`.

Super Cool!
