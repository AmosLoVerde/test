### Descrizione intuitiva
<br>
La <b>classe $\textit{NP-c}$</b> (abbreviazione di <i>NP-complete</i>) contiene i problemi decisionali che, rispetto alle riduzioni polinomiali standard, rappresentano il <b>nucleo più difficile</b> di $\textit{NP}$. Dire che un problema è in $\textit{NP-c}$ significa infatti affermare simultaneamente due fatti: da un lato esso appartiene a $\textit{NP}$, quindi le sue istanze positive ammettono certificati verificabili in tempo polinomiale; dall'altro lato, <i>ogni</i> problema di $\textit{NP}$ può essere trasformato in esso mediante una riduzione calcolabile in tempo polinomiale.
Quindi un problema NP-completo è, intuitivamente, un problema in cui può essere codificata tutta la difficoltà computazionale di $\textit{NP}$ con un sovraccarico al più polinomiale. Per questo motivo, se si trovasse un algoritmo deterministico in tempo polinomiale anche per <i>un solo</i> problema NP-completo, allora tutti i problemi di $\textit{NP}$ diventerebbero risolvibili in tempo polinomiale, e quindi seguirebbe $P=\textit{NP}$. Viceversa, se $P\neq \textit{NP}$, allora nessun problema NP-completo può appartenere a $P$.

<hr style="margin: 2rem 0;">

### Descrizione formale

<div class="definition-box" style="--box-color: #7c3aed;" data-title="Definizione [1]">
$$\textit{NP-c} = \lbrace A\text{ | } A\in \textit{NP}\text{ e }\forall B\in \textit{NP}\text{ vale }B\leq_p A\rbrace$$
</div>
dove:

* $A$ e $B$ sono <b>problemi decisionali</b>, cioè linguaggi su un alfabeto finito, oppure equivalentemente funzioni decisionali $A:I(A)\to\lbrace \text{yes, no}\rbrace$ e $B:I(B)\to\lbrace \text{yes, no}\rbrace$.
* $A\in \textit{NP}$ significa che esiste un verificatore deterministico polinomiale per le istanze positive di $A$, ossia che $A$ appartiene alla classe $\textit{NP}$.
* $B\leq_p A$ significa che <b>$B$ è riducibile in tempo polinomiale ad $A$</b> mediante una riduzione many-one (o di Karp): esiste una funzione $f$ calcolabile in tempo polinomiale tale che, per ogni istanza $x$, si ha $x\in B \iff f(x)\in A$.
* La quantificazione $\forall B\in \textit{NP}$ esprime che <b>ogni</b> problema di $\textit{NP}$ si riduce in tempo polinomiale ad $A$; quindi $A$ è almeno difficile quanto qualsiasi altro problema di $\textit{NP}$ rispetto a questa nozione standard di riduzione.
<br>
La definizione precedente va letta con estrema precisione: un problema è NP-completo non appena soddisfa simultaneamente la condizione di appartenenza a $\textit{NP}$ e la condizione di $\textit{NP}$-durezza rispetto a $\leq_p$. La prima impedisce che il problema sia “più difficile di NP”; la seconda garantisce che esso sia “almeno difficile quanto tutto NP”.
<br>
<br>
<div class="definition-box" style="--box-color: #7c3aed;" data-title="Definizione [2]">
$$\textit{NP-hard} = \lbrace A\text{ | }\forall B\in \textit{NP}\text{ vale }B\leq_p A\rbrace$$
</div>
Quindi:
$$
\textit{NP-c}=\textit{NP}\cap \textit{NP-hard}
$$
In modo equivalente: un linguaggio appartiene a $\textit{NP-c}$ se e solo se è in $\textit{NP}$ ed è $\textit{NP-hard}$ rispetto alle riduzioni polinomiali many-one. Da questa definizione segue immediatamente il principio fondamentale della teoria della NP-completezza: se $A\in \textit{NP-c}$ e inoltre $A\in P$, allora $P=\textit{NP}$. Inoltre, se $A\in \textit{NP-c}$ e $A\leq_p C$ con $C\in \textit{NP}$, allora anche $C\in \textit{NP-c}$.

<hr style="margin: 2rem 0;">

### Relazioni note con altre classi
<br>

* $\textit{NP-c}\subseteq \textit{NP}$

* $\textit{NP-c}\subseteq \textit{NP-hard}$

* $\textit{NP-c}\subseteq \textit{PSPACE}$

* $\textit{NP-c}\subseteq \textit{EXP}$

* Se $A\in \textit{NP-c}$ e $A\in P$, allora $P=\textit{NP}$

* Se $A\in \textit{NP-c}$ e $A\in \textit{co-NP}$, allora $\textit{NP}=\textit{co-NP}$


<hr style="margin: 2rem 0;">

### Relazioni ancora non note / problemi aperti
<br>

* $P \stackrel{?}{=} \textit{NP}$

* $\textit{NP} \stackrel{?}{=} \textit{co-NP}$

* Esiste un problema in $\textit{NP-c}$ che appartiene anche a $P$? Questo accade se e solo se $P=\textit{NP}$

* Esiste un problema in $\textit{NP-c}$ che appartiene anche a $\textit{co-NP}$? Questo accade se e solo se $\textit{NP}=\textit{co-NP}$

* Esistono problemi naturali in $\textit{NP}$ che non appartengono né a $P$ né a $\textit{NP-c}$? La risposta astratta è sì se $P\neq \textit{NP}$, per il teorema di Ladner; tuttavia nessun problema naturale universalmente accettato è noto essere tale.
