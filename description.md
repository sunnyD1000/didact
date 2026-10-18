didact
currently mac desktop application, might port to windows
Sidebar with all context needed
    Separated by “Content” (e.g. differential equations, geology). Users can create these folders to hold mandatory separated “Material” or “Examination” data (essentially 2 immutable directories under the content folder). No other directories can exist under a content folder. Created questions and previous answers are ‘associated’ with content files (users can access and view created questions per content file.
        Materials - lecture and textbook content, abstract conceptual behavior
            Creates either multiple choice conceptual questions or freely typed “Feynman” questions with Jev as a rubric
            Multiple choice conceptual questions behave the same as multiple choice non-modified examination questions, especially with its direct reference to where the LLM got its information from the materials
            For freely-typed (or voiced) questions, the LLM creates a short and concise natural language answer AND a list of essential propositions/claims/relationships constituting a correct answer that  goes along with its information from materials. This is compared to the user’s answer using Jev to produce a score for the question. A failing score means that the question would be asked again soon. A passing score means the question will be asked at the end of the deck of questions.
        Examination - quiz and test content, straight “out the syllabus” 
            Extract all questions and answers “word for word”
            Either has a numeric or multiple choice response
                These questions have a direct source to “Materials.”
                All of these questions are given 3 time limits (<5 minutes, <15 minutes, and >15 minutes)
                Time limit questions are best characterized by: “you either know it or not” (<5), “quick to moderate solve using the right method” (<15), and then “multi-stage exam problem” (>15)
            Uses spaced repetition just like Anki, correct answer would be the space difference of pressing “3” (good), and getting it wrong would be “1” (again)
            “Modified” Examination question involves LLM in the loop combines two related questions OR divides a big one into smaller piece, AND/OR changes numerical / conceptual answers according to methodology
                First, we use Jev to identify the probability that merging or dividing a “word for word” question “makes sense”
                We can find a merging or dividing question by looking at an example in “Materials” or “Examination” that combines two methods of solving a problem from one or more concepts
                Then, LLM creates the solution with a combination or division of practices
                The methodology to the solution is created from concepts in “Materials”, this can be verified by the user because it can be found by expanding a widget to the right of the screen
                User can mark question as “bad” question that throws it out the user deems it wrong or unneeded from verification
                If it’s not bad, this is added to the question bank related to the content folder
Main screen with the question then answer choices / answer box / typing box to the right of the left sidebar
