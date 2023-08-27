---
title: "A Gawk at Awk"
---


If you have spent any significant amount of time working in or around a terminal, you have likely come across some of the "[Basic Unix Tools](http://www.cs.toronto.edu/~maclean/csc209/unixtools.html)". To the scriptkids of today, these executable programs appear to be esoteric and outdated. They are but tools of a bygone era in which people were forced to do things in a odd ways. If the folks who developed these programs had access to fully-fledged IDEs or some of the rather wonderful applications which are central to the modern developer's workflow, surely they would have no need for these old school tools. The tools of Unix are Esoteric? Perhaps. They are not exactly "new", certainly. Outdated or unnecessary? Far from it. The wizards that constructed these utilities and mastered their usage certainly thought about computation and programming in a way entire different from the perspective we have towards computers and computation today. Learning about these tools gives you a glimpse of the processes which ran on their brains in the prior century and just might help you become better at doing interesting things.  

In this post I will attempt to introduce interested readers to `Awk`, one of the many command-line programs which make up the [Unix Command Line Utilities](https://www.wikiwand.com/en/List_of_Unix_commands). 


<BR>
<BR>


## Enter Awk 
Awk is an interpreted programming language, developed in 1977 by Alfred Aho, Brian Kernighan and Peter Weinberger whilst at AT&T Bell Laboratories. It was named through combining the creator's last names and for the rather cute and awfully dead '[Auk](https://www.wikiwand.com/en/Auk)' bird. It was developed as most good things are, for solving some pesky problems that plagued the authors. In their case in 77' they wanted a tool that was able to wrangle data and the outputs of existing Unix Utilities in useful ways. It is sort of a programmable glue for sticking together text in meaningful ways. The original `awk` was rather bare-bones, relegated to one-liner programs. It evolved into a proper programming language a few years after its original development, out of organic interest in the tool. Awk became the language of choice for many folks at Bell Laboratories, given it's simplicity, readability and composability with respect to other UNIX utilities -- these traits led folks to avoid more capable tools/languages in favor of pushing the less capable Awk beyond what it was originally scoped for doing. Given this interest in the language, the team packed in more features, like user-defined functions, in to the tool in 1985, making Awk into a fully fledged programming language that still sees use in 2023. 

The language can be thought of as a "generalization" of `grep` and `sed`, built to better handle structured data and do interesting things with the help of variables, arrays, complex functions through reusable scripting. Awk is the embodiment of the ideas behind `grep` and `sed` -- since in `awk` regular expressions are a fundamental aspect of the language, but you have more control over how data should be handled or read in. You also have the flexibility to write logic at the command line or in full files, unifying one-off tasks and complex scripts within the same syntax. When you are using something like `sed` for "a quick little thing" that evolves into something a bit too complex to easily complete, you need to swap your tool heavier one, `awk` is a tool suited for the light and heavy wrangling tasks you'll have. (even if it isn't always the most performant) 

In some sense, it kind of feels like `python` before python was invented, as it is a cross platform scripting language that looks a fair bit like pseudocode. The difference between `awk` and pseudocode though, is that `awk` programs are executable! Awk was developed with the intention of being "useful" from the start. This intention come through in the way one uses the language -- it feels like an honest, good-faith best effort programming language and it succeeds in its endeavor to be "useful".


<BR>
<BR>


## What can you Awk?
The background behind the language is fascinating, but what can we actually do with Awk? In short, a fair bit, but we need to understand how the tool works before we go around attempting to hammer screws in. In Awk we run *programs* at the command line with the `awk` command. One simple program might look as follows:

```
awk '$1 >= 8 { print $1 }' employee_pay_rates.txt
```

Where `employee_pay_rates.txt` is a text file with data like:
```
12.00   Marissa 
1.00   Kevin 
8.50   Pascal 
```

We run the specified program (string inside of `' '` quotes) on some input (the `employee_pay_rates.txt` file here) and then receive the following results: 

```
12.00
8.50
```

Translating this snippet into English; we find all lines in the `employee_pay_rates.txt` file where the pay rate (here field 1, `$1`) is greater than or equal to 8.00 -- on these lines where this condition holds true, we print the pay rate for that line. 

One modification we could make to the program to coax more interesting outputs would be to have it print the Employee's Name in addition to their pay rate: 

```
awk '$1 >= 8 { print $2 " makes " $1 " per hour" }' employee_pay_rates.txt
```
which modifies our output, returning: 

```
Marissa makes 12.00 per hour
Pascal makes 8.50 per hour
```

This program, whilst trivial, displays the core loop underpinning all Awk programs. We look at some "input" and check for "pattern" matches, then we take "actions" based on the patterns we encounter. This `Inputs-->Patterns-->Actions` loop holds for effectively all `Awk` programs. This standard way of handling, running and thinking about Awk programs is one of its delightful simplicities. We can hold this execution loop as constant in our minds whenever we work with `awk` and focus our attention on the logic we want to implement. 

Personally, I think that understanding the general layout of a system is the first step towards making changes or doing interesting things with that system. If you have no bearings where should you go?

In the context of Awk, we can assume that programs will generally look like the following: 

```
# Section to execute before seeing any inputs
BEGIN {
    # Define our Field Separator (FS) and Record Separator (RS)
    FS = "\t"
    RS = "\n"
}


{
	# Get a count of the number of fields per line
	i = 1
	while (i <= NF) {
		i++
	}

	# Print out some formatted information 
    printf("\n%s%s %s has field 1 set to- '%s' \n",
            FILENAME, "--Record NO.", FNR, $1)
	printf("  & it has %s fields\n", i)
	
	continents[$4] += 1
}


# We can use regex directly as patterns 
/North/ { print "  this line has the substring 'North' on it" }


# Multiple Patterns can be matched for any given input line
/Asia/ || /Europe/ { print "  this country is from the old world "} #one of the two patterns must be matched

$3 >= 250 &&  $2 >= 200 { print "  this is one large country..."} #both patterns must be matched


# Section that awk executes after iterating over all of the inputs 
END {
	print "this data file has: ", length(continents), "unique continents"
	# Iterate over an associative array and print some values
	for (c in continents){
		print c, continents[c]
	}

    # Unix ~= Home of Hacker, in AWK we can easily invoke other commands from inside a script  
    dircontents = system("ls -l")
}
```

Some additional notes might aid in understanding this simple program:
- The notion of "Input" is fundamental to `awk`, as the language was developed in and intended to be used for the Unix-y piping of stdouts 
  - It is fair to say that most Awk programs revolve around a central loop over provided "Input", so every program one constructs with Awk has a "for" loop at its core
  - Here "Input" refers to the source of data we supply to an Awk program, in a call to `awk` like: `awk -f prog logs.txt` our input is `logs.txt`.
    - We loop over all of the "records" (substrings, split by the variable "RS") in the file and for each record Awk parses the "fields" for it (substrings of the record, split apart via the character defined in "FS")
  - Awk has two "special" sections in a program's execution, the *BEGIN* and *END* blocks.
    - BEGIN blocks contain code that is to be executed before iterating over inputs in Awk
    - END blocks and their code are to be executed after completing the iteration over all inputs
    * one can include multiple "BEGIN" or "END" code sections in their program, all of which get concatenated into a single block in the order they are defined in at runtime 
- "fields" are those odd numbered things; Field 1 in a record is referred to in an Awk program via `$1`, field 2 is `$2` and field N is `$N`
  - Awk has a max limit on the number of fields a "record" can have, which may vary by `awk` distribution and machine
- This language comes with a plethora of built-in variables, `FILENAME, FS, etc.` which one can assume are always available for use.
- We can "define" variables rather magically, by conjuring them into existence simply by "using" them.
  - This is demonstrated with the var `continents` in the above program, simply using it as an Array in Awk is sufficient to declare it, no need for init'ing variables as we customarily do in other languages. 
  - The type of a variable is determined by the way in which you use it, or in other words the type is determined by the context. This *type coercion* automagically handles swapping between types.
  - All arrays in Awk are associative, (think python dictionary or JavaScript Object) and can be indexed either with; strings or numbers (all strings under the hood)
- Patterns play a very central role in the control flow of an Awk program, we can put multiple patterns together to match inputs we would like to take a certain action for.

If we were to invoke this program on a data file, say "countries" with the following contents:
```
USSR    8649    275 Asia
Canada  3852    25  North America
China   3705    1032    Asia
USA 3615    237 North America
Brazil  3286    134 South America
India   1267    746 Asia
Mexico  762 78  North America
France  211 55  Europe
Japan   144 120 Asia
Germany 96  61  Europe
England 94  56  Europe
```

We would get this output, most of which isn't exactly sensical but the illustrative portion of this example is the above code:
```
DATA/countries--Record NO. 1 has field 1 set to- USSR
  & it has 5 fields
  this country is from the old world
  this is one large country...

DATA/countries--Record NO. 2 has field 1 set to- Canada
  & it has 5 fields
  this line has the substring North on it

DATA/countries--Record NO. 3 has field 1 set to- China
  & it has 5 fields
  this country is from the old world
  this is one large country...

DATA/countries--Record NO. 4 has field 1 set to- USA
  & it has 5 fields
  this line has the substring North on it

DATA/countries--Record NO. 5 has field 1 set to- Brazil
  & it has 5 fields

DATA/countries--Record NO. 6 has field 1 set to- India
  & it has 5 fields
  this country is from the old world
  this is one large country...

DATA/countries--Record NO. 7 has field 1 set to- Mexico
  & it has 5 fields
  this line has the substring North on it

DATA/countries--Record NO. 8 has field 1 set to- France
  & it has 5 fields
  this country is from the old world

DATA/countries--Record NO. 9 has field 1 set to- Japan
  & it has 5 fields
  this country is from the old world

DATA/countries--Record NO. 10 has field 1 set to- Germany
  & it has 5 fields
  this country is from the old world

DATA/countries--Record NO. 11 has field 1 set to- England
  & it has 5 fields
  this country is from the old world
this data file has:  4 unique continents
South America 1
North America 3
Asia 4
Europe 3
total 16048
drwxr-xr-x@ 10 ckg  staff      320 Aug 26 13:18 DATA
-rw-r--r--@  1 ckg  staff     1077 Jul  1 14:07 LICENSE
-rw-r--r--@  1 ckg  staff     6316 Aug 26 15:44 README.md
drwx--x--x@ 72 ckg  staff     2304 Aug 26 15:40 SAMPLES
-rw-r--r--@  1 ckg  staff  8204128 Jul  1 14:07 The_AWK_Programming_Language.pdf
```


The above syntax and general flow constitutes the jist of Awk. The language is made powerful through using this set of primitives in conjunction with other programs at the command line. In the spirit of sensibility, Awk programs are run with one of the following two methods.

- Invoked directly on a program string: 
```
awk 'BEGIN { print $0 } inputdata'
```

- Invoked through referencing an Awk program file (commonly called "progfile"):
```
awk -f progfile inputdata
```

Where `progfile` contains the same code as in the single quote string of the first bullet point and `inputdata` is a file which might contain the text:
```
what a lovely moon.
oh wait, you're supposed to say "hello world"
```

And that is the introduction to the language! Awk comes in a few different flavours (as do all things Open Source) but the above syntax should carry over to the varietals. One descriptive list of the instantiations of the language can be found on the [wiki page](https://www.wikiwand.com/en/AWK#:~:text=Versions%20and%20implementations). To conclude, lets mess around with a useful program.

<BR>

**Problem**: How many commits have I made to `main` on a local git repo? 

**Solution ala Awk**:
```
BEGIN {FS = "\t"}
match($1, "([^<]*)>")  {
    email = substr($1, RSTART, RLENGTH-1)
    committers[email] += 1
}

END {
    print length(committers) " -- putting up commits in '" FILENAME  "'"
    for (person in committers) {
        print "  " person " made " committers[person] " commits."
    }
}
```

Which one might store in `prog` and run it inside a git repo, at the root dir as follows:
```
awk -f progfile .git/logs/refs/heads/main
```

Which for a particularly gawk-able repo on my local system returns: 
```
1 -- putting up commits in '.git/logs/refs/heads/main'
  chris@lindy.ai made 38 commits.
```

What we do in this program, is specify a field separator that splits the related datafile in to two nice fields. Then we find the unique contributors for this local branch via parsing out the unique emails with a Regex match pattern, keeping track of the number of commits associated with that email address. Finally once we have finished iterating over the entire file we dump the data we care about to stdout. 

This program took me about 5-ish min to whip up, and I am a complete novice. Imagine what a full-fledged Wizard could procure? 


<BR>
<BR>


## Where to learn a bit more
Its rather crazy that this language made in the 70s is still relevant today, both as a tool to do good work and as a learning opportunity.  It is not a general-purpose solution as is "python", but the ideas behind `awk` are worth walking through and sitting with. 

That walk with Awk might start with [The Awk Programming Language](https://ia803404.us.archive.org/0/items/pdfy-MgN0H1joIoDVoIC7/The_AWK_Programming_Language.pdf) or with [this repository](https://github.com/ckgresla/awkin) I threw together as I went through the book; containing runable example programs along with the data necessary to experiment with them. 

Learning Awk provides you an opportunity to get intimately familiar with regular expressions in an sensible way and I believe it opens the door to the idea that *your operating system, is your standard library*. An empowering perspective for the budding scriptkid. 



<BR>
<BR>
<BR>
<BR>

As we part ways, id like to share a snippet I found moving from my read of "The Awk Programming Language". First, think about how trivial it is to `git clone` some software. It is rather easy to get access to troves of useful magic on the internet with a protocol like this. To get your hands on Awk when the authors dropped the book, these were the suggested instructions:

> "This version of awk is part of Unix System V Release 3.1. Source code for this version is also available through AT&T's Unix System Toolchest software distribution system; call 1-201-522-6900 and log in as g u e s t . In Europe, con-tact AT&T Unix Europe in London (44-1-567-7711); in the Far East, contact AT&T Unix Pacific in Tokyo (81-3-431-3670)."

That is mental, have a wonderful day. 

