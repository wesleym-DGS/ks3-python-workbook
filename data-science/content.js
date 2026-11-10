window.WORKBOOK_COURSE_DATA = {
    id: 'data-science',
    syncPrefix: 'dataScience',
    strand: 'ict',
    title: 'Data science',
    shortTitle: 'Data science',
    intro: 'Ask useful questions, work carefully with data, and communicate evidence that can support a decision.',
    prerequisite: 'No specialist software knowledge is needed. You will need to evaluate evidence carefully, explain your choices, and follow your school’s rules when collecting class data.',
    sourceTitle: 'Data Science',
    sourceUrl: 'https://teachcomputing.org/curriculum/key-stage-3/data-science',
    achievements: ['Data Detective', 'Global Explorer', 'Statistical Thinker', 'Question Setter', 'Data Cleaner', 'Evidence Advocate'],
    tools: {
        gapminder: 'https://www.gapminder.org/tools/',
        codap: 'https://codap.concord.org/',
        datawrapper: 'https://www.datawrapper.de/'
    },
    lessons: [
        {
            title: 'Delving into data science',
            summary: 'Turn information into a visualisation that helps people notice patterns and ask better questions.',
            sections: [
                { heading: 'What is data science?', body: 'Data science is the practice of using data to investigate questions and communicate what the evidence can and cannot tell us. It combines careful questions, collecting or finding relevant data, organising and analysing it, and explaining results. A chart is one tool in that process, not the whole process.' },
                { heading: 'A visualisation can reveal a pattern', body: 'A table is useful for looking up exact values; a chart can make comparisons and changes easier to see. A good visualisation has a purpose, a meaningful choice of chart, readable labels, units, and a source. The design should help people interpret evidence rather than make a claim look more certain than it is.' },
                { heading: 'Two historical examples', body: 'Charles Minard’s graphic about Napoleon’s 1812 campaign combines the size and direction of the army with a map and a temperature scale, allowing readers to see losses across a journey. John Snow mapped cholera deaths around a London water pump in 1854; the locations helped him investigate a possible source. These examples show how location, time, and multiple variables can make evidence meaningful.' },
                { heading: 'A visualisation is not always an infographic', body: 'A visualisation encodes data in marks such as bars, points, or lines so that values can be compared. An infographic may combine illustrations, text, and selected facts to tell a designed story. Both can communicate information, but a reader should still be able to identify the evidence, its source, and what has been simplified.' },
                { heading: 'Read before you conclude', body: 'Start with the title and question. Check what each axis or category represents, its unit, and the scale. Describe a pattern using values where possible, then ask what the chart leaves out. One chart can suggest a question for further investigation; it rarely proves a whole explanation by itself.' }
            ],
            example: 'A small TV-viewing table might record a programme category and minutes watched. A bar chart can compare totals by category. The chart may show which category has the largest recorded total, but it does not explain why people watched it or whether the sample represents everyone.',
            misconception: 'A polished chart does not make weak data reliable. Visualisation helps people inspect evidence; it does not replace checking where the data came from and how it was collected.',
            chart: { title: 'Example viewing minutes by programme type', labels: ['Nature', 'Comedy', 'Sport', 'News'], values: [38, 52, 44, 26], unit: 'minutes in a small illustrative sample' },
            tools: [{ label: 'Optional: make a chart with Datawrapper', url: 'https://www.datawrapper.de/' }],
            questions: [
                { prompt: 'What is one useful purpose of a data visualisation?', choices: ['Make comparisons or patterns easier to inspect', 'Prove why a pattern happened', 'Remove the need to check a data source'], answer: 0 },
                { prompt: 'Which description best distinguishes a visualisation from an infographic?', choices: ['A visualisation encodes data for comparison; an infographic may combine data with explanatory design', 'An infographic is always more accurate', 'A visualisation cannot include labels'], answer: 0 },
                { prompt: 'What should you check before explaining a chart?', choices: ['Its labels, units, scale, and source', 'Only its colours', 'Whether it agrees with your first guess'], answer: 0 }
            ],
            project: {
                title: 'Read a chart with care',
                intro: 'Practise describing evidence without claiming more than the small example can support.',
                fields: [
                    { key: 'finding', label: 'What pattern or comparison do you notice?', placeholder: 'Use a category and value from the chart.' },
                    { key: 'limit', label: 'What can this chart not tell you?', placeholder: 'Think about the small sample or information not shown.' }
                ],
                csv: 'Programme type,Minutes watched\nNature,38\nComedy,52\nSport,44\nNews,26\n'
            }
        },
        {
            title: 'Global data',
            summary: 'Use criteria and predictions to explore large datasets, then qualify what a comparison means.',
            sections: [
                { heading: 'Data is collected at scale', body: 'Phones, sensors, websites, transport systems, and public services can produce large amounts of data. Large datasets can help researchers compare places or look for changes over time. Size alone does not guarantee quality: collection methods, missing values, definitions, and who is represented still matter.' },
                { heading: 'Ask what a comparison means', body: 'Questions such as “What is the best place to live?” have no single answer until “best” is defined. Choose criteria such as life expectancy, income, access to education, safety, climate, or distance from family. Different criteria can lead to different answers, and measures may not capture everyone’s experiences.' },
                { heading: 'Predict, explore, and revise', body: 'Before exploring a dataset, write down a prediction and the evidence that could support or challenge it. Gapminder makes it possible to compare measures for many countries over time. Select variables and a time period deliberately, inspect labels and units, and note countries or years with missing data.' },
                { heading: 'Large does not mean representative', body: 'A dataset can include millions of records and still leave out groups or places. A dataset from people who choose to use a service may not represent people who do not use it. When making a claim, describe the dataset’s coverage and the limits of the sample.' },
                { heading: 'Correlation is a clue, not an explanation', body: 'When two measures change together, a graph may show an association. That pattern can help generate questions, but it does not prove that one measure caused the other. Other factors, choices about which data to include, and unusual points may affect what you see.' }
            ],
            example: 'If you compare income per person with life expectancy, some countries may appear to follow a broad upward pattern. The relationship varies and does not prove that income alone causes longer life. Health services, conflict, environment, inequality, and data quality could also matter.',
            misconception: 'A very large dataset is not automatically fair or representative. Ask who and what is missing, how the values were collected, and whether the same definitions were used.',
            chart: {
                type: 'scatter',
                title: 'Illustrative relationship between income and life expectancy',
                xLabel: 'Income per person (illustrative units)',
                yLabel: 'Life expectancy (years)',
                points: [
                    { label: 'Place A', x: 5000, y: 64 },
                    { label: 'Place B', x: 12000, y: 71 },
                    { label: 'Place C', x: 22000, y: 76 },
                    { label: 'Place D', x: 35000, y: 80 }
                ],
                unit: 'Illustrative teaching points only; association does not establish cause.'
            },
            tools: [{ label: 'Explore country data in Gapminder Tools', url: 'https://www.gapminder.org/tools/' }],
            questions: [
                { prompt: 'Why should a class define “best place to live” before comparing data?', choices: ['Different criteria can produce different answers', 'Every country has the same measures', 'A prediction is not allowed'], answer: 0 },
                { prompt: 'What does a large dataset guarantee?', choices: ['Nothing by itself; coverage and collection still need checking', 'That every group is represented', 'That the data contains no errors'], answer: 0 },
                { prompt: 'What is a responsible use of a prediction?', choices: ['Compare it with evidence and revise it if needed', 'Keep it even if evidence disagrees', 'Treat it as the final conclusion'], answer: 0 }
            ],
            project: {
                title: 'Define your comparison',
                intro: 'Use Gapminder or a provided global dataset. Record the choices that shape your investigation; do not treat one measure as a complete definition of quality of life.',
                fields: [
                    { key: 'criteria', label: 'Which two or more criteria will you use, and why?', placeholder: 'Name the measures and explain why they matter.' },
                    { key: 'prediction', label: 'What is your prediction before exploring?', placeholder: 'I predict... because...' },
                    { key: 'evidence', label: 'What evidence changed or qualified your prediction?', placeholder: 'Refer to a measure, place, or time period.' }
                ]
            }
        },
        {
            title: 'Statistical state of mind',
            summary: 'Investigate relationships cautiously, notice outliers, and use the PPDAC cycle to structure an enquiry.',
            sections: [
                { heading: 'Describe a relationship', body: 'A variable is a characteristic that can take different values, such as roller-coaster height or ride duration. Correlation describes an association between variables. A positive correlation means larger values of one variable tend to appear with larger values of another; a negative correlation means one tends to be smaller as the other is larger. A scatter plot helps inspect paired numerical values.' },
                { heading: 'Correlation is not causation', body: 'An association does not establish that one variable caused the other. A third variable may influence both, the pattern may be coincidental, or the data may cover only a small range. Use careful language such as “in this dataset, these values tend to occur together” rather than claiming proof of cause.' },
                { heading: 'Look for outliers', body: 'An outlier is a value far from the main pattern. It may be a measurement or entry error, or it may be a real and important case. Check its source and context before deciding what to do. Do not remove a value just because it weakens your expected pattern.' },
                { heading: 'Use all five PPDAC stages', body: 'Problem: define a question that data can answer. Plan: decide what data and method are appropriate. Data: collect or find the observations. Analysis: organise, visualise, and look for patterns. Conclusion: answer the question with evidence, limitations, and possible next steps. The cycle can repeat when a conclusion raises a new question.' },
                { heading: 'Apply the cycle to a constraint', body: 'A question such as “Which roller coaster is best?” needs a criterion. You might ask whether taller rides tend to have longer tracks, while noting that the dataset includes a 350-foot height constraint. The constraint changes which designs are possible; it does not prove which ride people will enjoy.' }
            ],
            example: 'For a roller-coaster investigation, a useful question could be: “Among the rides in this dataset that are no taller than 350 feet, how does height relate to track length?” Compare paired values, inspect any unusual ride, and state that the dataset cannot establish which ride is most enjoyable.',
            misconception: 'An outlier is not automatically a mistake, and correlation does not show that one variable caused another.',
            chart: {
                type: 'scatter',
                title: 'Illustrative roller-coaster height and track length',
                xLabel: 'Height (feet; maximum 350)',
                yLabel: 'Track length (metres)',
                points: [
                    { label: 'Ride A', x: 100, y: 800 },
                    { label: 'Ride B', x: 180, y: 1400 },
                    { label: 'Ride C', x: 250, y: 1900 },
                    { label: 'Ride D', x: 310, y: 2400 },
                    { label: 'Ride E', x: 340, y: 1700 }
                ],
                unit: 'Illustrative teaching points; every ride shown meets the 350-foot height constraint.'
            },
            tools: [{ label: 'Open CODAP for data exploration', url: 'https://codap.concord.org/' }],
            questions: [
                { prompt: 'What can a correlation support?', choices: ['A description of how variables are associated in the data', 'Proof that one variable caused another', 'A guarantee about every future case'], answer: 0 },
                { prompt: 'What is a sensible first step when you notice an outlier?', choices: ['Check its source and context', 'Delete it immediately', 'Change it to match the prediction'], answer: 0 },
                { prompt: 'Which order matches the PPDAC cycle?', choices: ['Problem, Plan, Data, Analysis, Conclusion', 'Plan, Problem, Conclusion, Data, Analysis', 'Prediction, Proof, Data, Answer, Chart'], answer: 0 }
            ],
            project: {
                title: 'Plan a fair comparison',
                intro: 'Use the roller-coaster example to make a question answerable and to state what your data cannot show.',
                fields: [
                    { key: 'question', label: 'Write a question involving two measurable variables.', placeholder: 'For rides no taller than 350 feet, how does...?' },
                    { key: 'plan', label: 'What data and chart would help answer it?', placeholder: 'Name both variables and an appropriate comparison.' },
                    { key: 'caution', label: 'What can this dataset not prove?', placeholder: 'For example, distinguish association from cause.' }
                ]
            }
        },
        {
            title: 'Data for action',
            summary: 'Plan the school-litter investigation: ask an answerable question, predict, and design data capture.',
            sections: [
                { heading: 'Start with a local problem', body: 'A useful investigation begins with a question that matters to its audience and can be answered with evidence. “Why is the school untidy?” is broad and assumes a cause. A more focused question might compare the kinds or counts of litter in agreed school areas at a particular time.' },
                { heading: 'Complete Problem and Plan', body: 'In PPDAC, define the problem before collecting data. State a prediction and explain why it seems plausible. Then decide which variables are needed, how each will be recorded, where and when observations will happen, how many observations are feasible, and how the method will be kept consistent.' },
                { heading: 'Design a useful capture form', body: 'A capture form should make each observation clear and consistent. Possible fields include an anonymous area code, date or time period, litter category, quantity, approximate distance from the nearest bin, and whether an item is recyclable according to the agreed categories. Define each category and measure before collecting data. Do not record names, faces, student behaviour, or other personal information.' },
                { heading: 'Collect data safely and fairly', body: 'Use only a method approved by the school and teacher. Observe agreed locations without disrupting lessons or identifying individuals. Students should not handle litter as part of this activity. If fieldwork is not permitted, use an anonymised teacher-provided or simulated dataset instead. Record missing observations honestly rather than guessing.' },
                { heading: 'Keep the data in approved tools', body: 'Use a school-approved Forms or spreadsheet tool for class capture. Agree who can access the responses, how long they are kept, and which anonymised columns are needed for analysis. Do not upload student names or raw class responses to this workbook.' }
            ],
            example: 'A focused question could be: “In our agreed observation periods, which of the three named school areas has the highest count of visible litter items?” A simple plan defines the same observation duration and categories for each area, then records only area, period, category, and count.',
            misconception: 'A prediction is not a result. Collect comparable observations at each chosen location and report the evidence even when it disagrees with your expectation.',
            tools: [{ label: 'Use your school-approved form or spreadsheet tool', url: null }],
            questions: [
                { prompt: 'Which is the most answerable litter question?', choices: ['Which agreed area has the highest recorded count during our observation periods?', 'Why are students careless?', 'How can all litter be stopped forever?'], answer: 0 },
                { prompt: 'Why define categories before collecting observations?', choices: ['So observers record comparable items consistently', 'So unexpected data can be removed', 'So the prediction is guaranteed'], answer: 0 },
                { prompt: 'What should students do if safe fieldwork is not approved?', choices: ['Use a teacher-provided or simulated dataset', 'Collect data secretly', 'Handle litter without supervision'], answer: 0 }
            ],
            project: {
                title: 'Plan the class investigation',
                intro: 'Work with your teacher and use only a school-approved form or spreadsheet. The workbook stores your plan, not class responses or personal information.',
                fields: [
                    { key: 'question', label: 'Investigation question', placeholder: 'Which places, items, or time periods will you compare?' },
                    { key: 'prediction', label: 'Prediction and reason', placeholder: 'I predict... because...' },
                    { key: 'variables', label: 'Data fields and consistent definitions', placeholder: 'List the non-personal variables and how each will be recorded.' },
                    { key: 'method', label: 'Safe collection method', placeholder: 'State the approved locations/times, observation rules, and fallback.' }
                ],
                csv: 'Area code,Observation period,Litter category,Count,Recyclable category\nA,1,Paper,0,Yes\n'
            }
        },
        {
            title: 'Clean it up',
            summary: 'Check the class dataset, document careful cleaning, and visualise variables in CODAP.',
            sections: [
                { heading: 'Cleaning makes a dataset usable', body: 'Before analysis, check whether entries use the agreed categories and units. Look for blank fields, repeated rows, spelling differences, impossible values, and inconsistent formats. Keep a copy of the original file and make a record of changes so another person can understand what was changed and why.' },
                { heading: 'Handle missing data honestly', body: 'A blank value is not the same as zero. Check the original source or ask the data collector whether it can be corrected. If it cannot be recovered, mark it as missing using the agreed convention and state how the analysis handles it. Do not invent a value just to complete a row.' },
                { heading: 'Duplicates, invalid values, and outliers', body: 'A duplicate may have been entered twice or may represent two genuine observations; compare identifiers and context before removing it. An invalid value may contradict the form’s allowed categories or units. A surprising outlier should be checked, not automatically deleted: unusual evidence may be real.' },
                { heading: 'Do not clean away disagreement', body: 'Cleaning is about accuracy and consistency, not making data support a prediction. Never remove an observation only because it disagrees with your expectation. If a valid value changes the pattern, keep it and explain what that means.' },
                { heading: 'Visualise comparisons in CODAP', body: 'After checking the data, import the approved anonymised CSV into CODAP. Choose a chart that fits the question: bars can compare counts across categories; a graph can compare two numerical measures. Add clear labels and units. Look for differences between variables, not just a single total.' }
            ],
            example: 'If one row says “plastik” while the form defined the category as “plastic,” verify the meaning and document any standardisation. If a count is blank, do not replace it with zero unless the original observation confirms that zero items were found.',
            misconception: 'Cleaning is not a way to make the chart agree with your prediction. Preserve valid observations, document justified corrections, and state how missing values affect interpretation.',
            chart: { title: 'Illustrative litter records before review', labels: ['Complete', 'Missing count', 'Check category', 'Possible duplicate'], values: [18, 2, 3, 1], unit: 'example records; not class results' },
            tools: [{ label: 'Explore data in CODAP', url: 'https://codap.concord.org/' }],
            questions: [
                { prompt: 'How should an unexplained blank count be treated?', choices: ['Investigate it and keep it marked as missing if unresolved', 'Change it to zero', 'Copy the previous row’s count'], answer: 0 },
                { prompt: 'When is it appropriate to remove a duplicate row?', choices: ['After checking it is a duplicate and recording the cleaning decision', 'Whenever it weakens the prediction', 'Whenever two rows share a category'], answer: 0 },
                { prompt: 'Why keep a record of cleaning changes?', choices: ['So the process is transparent and can be checked', 'So no one can see the original data', 'So unusual data disappears'], answer: 0 }
            ],
            project: {
                title: 'Clean and visualise the data',
                intro: 'Use the class dataset only in the approved tool. Save no raw class data or personal information in this workbook.',
                fields: [
                    { key: 'checks', label: 'What did you check or correct?', placeholder: 'Describe missing, duplicated, invalid, or inconsistent entries.' },
                    { key: 'log', label: 'Cleaning log and reasons', placeholder: 'State each justified change and how you documented it.' },
                    { key: 'chart', label: 'Which two variables will your chart compare?', placeholder: 'Name the variables, chart type, labels, and units.' },
                    { key: 'pattern', label: 'What pattern do you notice so far?', placeholder: 'Describe evidence without removing data that disagrees.' }
                ]
            }
        },
        {
            title: 'Make a change',
            summary: 'Use visual evidence to make a measured conclusion, recommendation, and plan for further research.',
            sections: [
                { heading: 'Connect the question to the evidence', body: 'A conclusion should answer the investigation question, refer to the cleaned dataset and visualisations, and distinguish what was observed from what is inferred. Use specific comparisons or values rather than phrases such as “the chart proves it.”' },
                { heading: 'Compare more than one variable', body: 'A total count may hide differences in litter type, area, or observation period. Compare the variables that your question planned to investigate. A second chart can reveal a different pattern, but each chart should have a purpose and use clear categories, scales, and units.' },
                { heading: 'Make recommendations that fit the evidence', body: 'A recommendation should be practical and proportionate to the findings. If one area had more recorded litter in a limited set of observations, a suitable next step might be another observation period or a targeted reminder—not a claim about every student or every day.' },
                { heading: 'Explain limits and uncertainty', body: 'State what your dataset does not cover: the locations and times observed, missing entries, small sample size, or category judgements. These limitations affect how widely a conclusion can be applied. Be precise about whether a pattern is an association and avoid claiming cause without an appropriate investigation.' },
                { heading: 'Suggest the next question', body: 'The conclusion stage can begin another PPDAC cycle. Further work might compare the same areas at a different time, test whether bins are accessible, or clarify a category that observers found difficult. A new question should be answerable, safe, and respectful of privacy.' }
            ],
            example: '“Across the two teacher-approved observation periods, area B had the largest recorded count. Most entries there were food packaging. This suggests we could repeat observations and check whether an additional bin is needed; our small sample does not show that the pattern happens every day or explain its cause.”',
            misconception: 'A recommendation is not evidence that an intervention will work. Match the strength of the recommendation to the dataset and name a sensible follow-up check.',
            chart: {
                type: 'scatter',
                title: 'Illustrative litter count and distance to a bin',
                xLabel: 'Distance to nearest bin (metres)',
                yLabel: 'Litter count',
                points: [
                    { label: 'Area A', x: 1, y: 10 },
                    { label: 'Area B', x: 3, y: 7 },
                    { label: 'Area C', x: 5, y: 5 },
                    { label: 'Area D', x: 8, y: 4 }
                ],
                unit: 'Illustrative teaching points only; a pattern does not prove that distance caused the counts.'
            },
            tools: [{ label: 'Continue exploring in CODAP', url: 'https://codap.concord.org/' }],
            questions: [
                { prompt: 'Which conclusion is best supported by a small, time-limited dataset?', choices: ['During these observations, area B had the highest recorded count', 'Area B always has the most litter', 'Students in area B caused the litter'], answer: 0 },
                { prompt: 'What makes a recommendation proportionate?', choices: ['It is practical and matches the scope and limits of the evidence', 'It promises a result the data did not measure', 'It blames a group without evidence'], answer: 0 },
                { prompt: 'Why include further questions?', choices: ['A conclusion can identify what new evidence would help', 'It replaces the need to show evidence', 'It proves the current recommendation will work'], answer: 0 }
            ],
            project: {
                title: 'Present an evidence-based recommendation',
                intro: 'Use anonymised findings from your approved class dataset. Do not paste raw rows, names, or sensitive information into this workbook.',
                fields: [
                    { key: 'evidence', label: 'What evidence answers your question?', placeholder: 'Refer to the comparison or values shown in your charts.' },
                    { key: 'conclusion', label: 'Conclusion', placeholder: 'Answer the question and distinguish observation from inference.' },
                    { key: 'recommendation', label: 'Recommendation', placeholder: 'Suggest a practical next step that matches the evidence.' },
                    { key: 'limits', label: 'Limitations and further question', placeholder: 'Name a limit and one safe, answerable follow-up question.' }
                ]
            }
        }
    ]
};
