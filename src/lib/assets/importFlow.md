```mermaid
flowchartdata TD

	A[Main Source Realtime<br/>dataType = jsonDb] --> C(MIX)
	B[Main Source Realtime<br/>dataType = md] --> C

	C --> D{Match Exists?<br/>IF dataType=jsonDb DO -Normalize Title: Strip Symbols + Lowercase;; IF dataType=Md do both Title, AlternativeTitles}

	%% NO MATCH
	D -->|NO| N1[Add New Entry<br/>dataType = Lib]

	%% MATCH
	D -->|YES| E{DataType Matches?}

	%% DataType MATCH
	E -->|YES| F{Description Matches?}

	%% Desc MATCH
	F -->|YES| U1[Update description & badges<br/>DISTINCT merge:<br/>tags, characters-mergeByName, rows-mergeByChapterSE]

	%% Desc DIFFER
	F -->|NO| T1{Incoming dataType?}

	T1 -->|jsonDb| U2[Update description & badges<br/>DISTINCT merge:<br/>tags, characters-mergeByName, rows-mergeByChapterSE]
	T1 -->|md| A1[Set existing <br/>dataType = Archive<br/>Add new entry]

	%% DataType NOT MATCH
	E -->|NO| T2{Incoming dataType?}

	T2 -->|md| A2[Set existing <br/>dataType = Archive<br/>Add new entry]
	T2 -->|jsonDb| U3[Update description & badges<br/>DISTINCT merge:<br/>tags, characters-mergeByName, rows-mergeByChapterSE]
```

```mermaid
flowchart TD
    A[Start importFromJSON] --> B[Load existing entries]
    B --> D{For each incoming entry}

    %% ===============================
    %% FINGERPRINT CHECK
    %% ===============================

    D --> E[Compute fingerprint<br/>Normalize MainTitle]
    E --> F{Fingerprint exists?}

    %% ===============================
    %% NO MATCH
    %% ===============================

    F -->|NO| N1[Remove id from incoming]
    N1 --> N2[Add New Entry<br/>dataType = incoming.dataType or 'Lib']
    N2 --> N3[Add to fingerprintMap]
    N3 --> D

    %% ===============================
    %% MATCH EXISTS
    %% ===============================

    F -->|YES| M1[Get existing entry]

    M1 --> M2{Incoming dataType = md?}

    %% ===============================
    %% INCOMING MD
    %% ===============================

    M2 -->|YES| M3[Compare description]
    M3 --> M4{Description changed<br/>& existing not Archive?}

    M4 -->|YES| A1[Set existing dataType = Archive]
    A1 --> A2[Remove id from incoming]
    A2 --> A3[Add new entry<br/>dataType = Lib]
    A3 --> D

    %% ===============================
    %% MD BUT NO CHANGE
    %% ===============================

    M4 -->|NO| U1[Proceed to Merge & Update]

    %% ===============================
    %% INCOMING JSON / NON-MD
    %% ===============================

    M2 -->|NO| U1

    %% ===============================
    %% MERGE & UPDATE
    %% ===============================

    U1 --> U2[Merge Tags<br/>DISTINCT Set union]
    U2 --> U3[Merge Characters<br/>by Name incoming overwrites]
    U3 --> U4[Merge Rows<br/>by ChapterSE incoming overwrites]
    U4 --> U5{Was existing Archive<br/>& incoming NOT md?}

    U5 -->|YES| U6[finalType = Lib]
    U5 -->|NO| U7[finalType = incoming.dataType]

    U6 --> U8[Update existing entry<br/>description, badges,<br/>cover, merged data,<br/>dataType = finalType]
    U7 --> U8

    U8 --> D

    %% ===============================
    %% LOOP END
    %% ===============================

    D --> Z[End Import]
```