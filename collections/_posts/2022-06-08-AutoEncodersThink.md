---
title: "Autoencoders are Thought Machines"
---

​

Intelligence might be thought of as the ability to compress information. Learning then is being able to find useful compressions of larger concepts that can be queried or accessed in an efficent way. What learning about something feels like is a sort of grinding proccess of trying to find a representation of the concept that works for the way our Brain is wired and for the reason which we are attempting to understand this concept. What I find rather interesting about learning and the thoughts that arise whilst trying to learn, is the place your mind goes in between the "first look" and the "aha!" moments. Autoencoders seem to be one way for computers to form these connections, boiling down the original data they are given into a useful compression.

The Godfather of Artificial Intelligence, **Geoffrey Hinton** is infamous for his colorful intuitions that describe phenomena in ways that just click. This has two effects;

1. it makes learning fun (and therefore concepts are sticky)
2. the understanding attained through a rich intuition leads to richer understanding.

One brilliant example of this style is presented in this lecture- https://youtu.be/zl99IZvW7rE with the particularly pertinent bit running from about 16:20 to 16:50. (this way of spitting facts was moving enough for me to write this post, so strong intuitions either from first principles or by analogy are brilliant)

​
​

The jist of the intuition:

- Encoders compress real world observations into a thought
- Decoders expand thoughts into real world data (i.e. if you see cat in an image the decompression of the representation of cat could be writing the word “cat” or saying “that is a cat”)
- Thoughts = Latent Representations
- Autoencoders, whilst dealing with multi-modal datasets (e.g. captioning images) are effectively generating thoughts about what they see and translating that into a different real-world expression of the same concept (see [this image](https://raw.githubusercontent.com/ankushjain2001/aj2885_das968_Autoencoder_Image_Captioning/master/output/m_100eps_mse_adam_aug6739_32_16_16_5x5/000000024020_results.png) from [this repo](https://github.com/ankushjain2001/Image-Captioning-with-Autoencoders))

The romance behind the intuition:

The “Latent Representation” that an Encoder creates works out to function similarly to the way we have thoughts — thoughts are not fully described if one tries to express their meaning in real-world data like speaking or writing. (i.e. thoughts are encapsulations of concepts at a lower level than real-world data like language or images which are much more rich, not as compressed) A romantic quote attributed to the Universe’s friend Albert Einstein goes something like “To sense that behind anything that can be experienced there is a something that our minds cannot grasp, whose beauty and sublimity reaches us only indirectly… This is Religiousness.” From this one might glean a take on what ideas are — the useful bits of the input data that our Brain recieves (famously the “thought handling” or conscious part of our Brain is only able to handle about 40-50 bits of information per second, a little bit smaller than the estimated 11 million bits the whole brain can handle per second). Therefore we might come to think that Autoencoders, and by extension neural nets, are quite literally a simulation of Human thinking (as they were intended to be) and that to better understand the phenomena they pose we need to develop richer understandings of what is going on internally to us (and the nets) with more **awesome** intuitions.

​
