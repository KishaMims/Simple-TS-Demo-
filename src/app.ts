// Code goes here!
//drag and drop interfaces
interface  Draggable {
  //methods
  dragStartHandler(event: DragEvent): void;
  dragEndHandler(event: DragEvent): void;
}

interface DragTarget {
  dragOverHandler(event: DragEvent): void;
  dropHandler(event: DragEvent): void;
  dragLeaveHandler(event: DragEvent): void;
}

//project type class
enum ProjectStatus { 
  Active, 
  Finished};

class Project {
  constructor(
    public id: string, 
    public title: string, 
    public description: string, 
    public people: number, 
    public status: ProjectStatus) {
  }
}

//project state management class

type Listener <T> = (items: T[]) => void;

class State<T> {
  protected listeners: Listener<T>[] = [];

  addListener(listenerFn: Listener<T>) {
    this.listeners.push(listenerFn);
  }
}

class ProjectState extends State <Project> {
  private projects: Project[] = [];
  private static instance: ProjectState;

  private constructor(){
    super()
  }

  static getInstance(){
    if(this.instance) {
      return this.instance;
    }
    this.instance = new ProjectState();
    return this.instance;
  }

addProject(title: string, description: string, numOfPeople: number) {
    const newProject = new Project(
      Math.random().toString(), 
      title,
      description,
      numOfPeople,
      ProjectStatus.Active
       );
    this.projects.push(newProject);
    for(const listnerFn of this.listeners){
      listnerFn(this.projects.slice());
    }
  }

  moveProject(projectId: string, newStatus: ProjectStatus){
    const project = this.projects.find(prj => prj.id === projectId);
    if(project && project.status !== newStatus){
      project.status = newStatus;
      this.updateListners();
    }

  }

  private updateListners(){
    for(const listenerFn of this.listeners){
      listenerFn(this.projects.slice());
    }
  }
}



//global instance of project state
// will only have one obj of the type in the entire application
const projectState = ProjectState.getInstance();



//validation logic 
interface Validatable {
  value: string | number;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
}

function validate(validatableInput: Validatable){
  let isValid =  true;
  if(validatableInput.required){
    isValid = isValid && validatableInput.value.toString().trim().length !== 0;
  }
  if(
    validatableInput.minLength != null && 
    typeof validatableInput.value === 'string'
){
    isValid = 
    isValid && validatableInput.value.length >= validatableInput.minLength;
  }
  if(
    validatableInput.maxLength != null && 
    typeof validatableInput.value === 'string'
    ){
    isValid = isValid && validatableInput.value.length <= validatableInput.maxLength;
  }
  if(validatableInput.min != null && typeof validatableInput.value === 'number') {
    isValid = isValid && validatableInput.value >= validatableInput.min;
    }
  if(validatableInput.max != null && typeof validatableInput.value === 'number') {
      isValid = isValid && validatableInput.value <= validatableInput.max
    }
  return isValid;
}

//adding auto bind decorator, a decorator is a function 

function autobind(
    _: any, 
    _2: string, 
    descriptor: PropertyDescriptor
    ){
        const originalMethod =  descriptor.value;
        const adjDescriptor: PropertyDescriptor = {
            configurable: true,
            get(){
            const boundFn = originalMethod.bind(this);
            return boundFn;
            }
        };
        return adjDescriptor;
}

//component base class
abstract class Component<T extends HTMLElement, U extends HTMLElement> {
  templateElement: HTMLTemplateElement;
  hostElement: T;
  element: U;

  constructor(
    templateId: string,
    hostElementId: string,
    insterAtStart: boolean,
    newElementId?: string
  ) {
    this.templateElement = document.getElementById(
     templateId
    )! as HTMLTemplateElement;
    this.hostElement = document.getElementById(hostElementId)! as T;

    const importedNode = document.importNode(
      this.templateElement.content,
      true
    );
    this.element = importedNode.firstElementChild as U;
    if (newElementId) {
      this.element.id = newElementId;
    }
    this.attach(insterAtStart);
  }
  private attach(instertAtBeginning: boolean) {
    this.hostElement.insertAdjacentElement(
      instertAtBeginning ? 'afterbegin' : 'beforeend',
      this.element
      );
  }
  abstract configure(): void;
  abstract renderContent(): void;
}


// project item class
class ProjectItem extends Component<HTMLUListElement, HTMLLIElement> 
  implements Draggable{
  private project: Project;

  // a getter is like a function you must return a value
  get persons(){
    if(this.project.people === 1) {
      return '1 person';
    } else {
      return `${this.project.people} people`
    }
  }

  constructor(hostId: string, project: Project) {
    //provide id where id of elemenet should be renederd 
    super('single-project', hostId, false, project.id);
    this.project = project;
    this.configure();
    this.renderContent();
  }
  @autobind
  dragStartHandler(event: DragEvent){
    event.dataTransfer!.setData('text/plain', this.project.id);
    event.dataTransfer!.effectAllowed = 'move';
  }

  dragEndHandler(_: DragEvent){
    console.log('DragEnd')
  }
  
  configure() {
    this.element.addEventListener('dragstart', this.dragStartHandler)
    this.element.addEventListener('dragend', this.dragEndHandler)

  }
   renderContent() {
     this.element.querySelector('h2')!.textContent = this.project.title;
     this.element.querySelector('h3')!.textContent = this.persons + ' assigned.';
     this.element.querySelector('p')!.textContent = this.project.description;
    }

  }


//project list class
class ProjectList extends Component <HTMLDivElement, HTMLElement>
implements DragTarget {
  assignedProjects: Project[];

 constructor(private type: 'active' | 'finished') {
   super('project-list', 'app',false,`${type}-projects`)
   this.assignedProjects = [];

   this.configure();
   this.renderContent();
 }
 @autobind
 dragOverHandler(event: DragEvent) {
   if(event.dataTransfer && event.dataTransfer.types[0] === 'text/plain') {
     event.preventDefault();
   const listEl = this.element.querySelector('ul')!;
   listEl.classList.add('droppable');
  }
 }
 @autobind
 dropHandler(event: DragEvent) {
   const prjID =(event.dataTransfer!.getData('text/plain'));
   projectState.moveProject(prjID,this.type === 'active' ? ProjectStatus.Active : ProjectStatus.Finished);
 }

 @autobind
 dragLeaveHandler(_: DragEvent) { 
  const listEl = this.element.querySelector('ul')!;
  listEl.classList.remove('droppable');
 }


 configure() {
  this.element.addEventListener('dragover', this.dragOverHandler);
  this.element.addEventListener('dragleave', this.dragLeaveHandler);
  this.element.addEventListener('drop', this.dropHandler);
  projectState.addListener((projects: Project[]) => {
    const relevantProjects = projects.filter(prj => {
      if (this.type === 'active') {
        return prj.status === ProjectStatus.Active;
      }
      return prj.status === ProjectStatus.Finished;
    });
    this.assignedProjects = relevantProjects;
    this.renderProjects();
  });
}

 renderContent() {
    const listId = `${this.type}-projects-list`;
    this.element.querySelector('ul')!.id = listId;
    this.element.querySelector('h2')!.textContent =
      this.type.toUpperCase() + ' PROJECTS';
  }

  private renderProjects(){
  const listEl =  document.getElementById(
    `${this.type}-projects-list`)! as HTMLUListElement;
  listEl.innerHTML = '';
  for(const prjItem of this.assignedProjects) {
    new ProjectItem (this.element.querySelector('ul')!.id, prjItem);
  }
 }
}
//making new project list 


// add constructor to get access to form template
class ProjectInput extends Component <HTMLDivElement, HTMLFormElement> {
  titleInputElement: HTMLInputElement;
  descriptionIputElement: HTMLInputElement;
  peopleInputElement: HTMLInputElement;

  // use type casting to tell ts what type of element we are getting
    constructor() {
      super('project-input', 'app', true, 'user-input');
      this.titleInputElement = this.element.querySelector(
        "#title"
      ) as HTMLInputElement;
      this.descriptionIputElement = this.element.querySelector(
        "#description"
      ) as HTMLInputElement;
      this.peopleInputElement = this.element.querySelector(
        "#people"
      ) as HTMLInputElement;
    this.configure();
  }

  configure() {
    this.element.addEventListener('submit', this.submitHandler);
  }

  renderContent() {}

  //make a tupple
  private gatherUserInput(): [string, string, number] | void {
    const enteredTitle = this.titleInputElement.value;
    const enteredDescription = this.descriptionIputElement.value;
    const enteredPeople = this.peopleInputElement.value;
    
    const titleValidatable: Validatable = {
      value: enteredTitle,
      required: true
    };

    const descriptionValidatable: Validatable = {
      value: enteredDescription,
      required: true,
      minLength: 5
    };

    const peopleValidatable: Validatable = {
      value: enteredPeople,
      required: true,
      min: 1,
      max: 5
    };

    if (
      !validate(titleValidatable) ||
      !validate(descriptionValidatable) ||
      !validate(peopleValidatable)
    ) {
      alert("Invalid input please try again!");
      return;
    } else {
      return [enteredTitle, enteredDescription, +enteredPeople];
    }
  }

  private clearInput(){
    this.titleInputElement.value = '';
    this.descriptionIputElement.value = '';
    this.peopleInputElement.value = '';
  }

  @autobind
  private submitHandler(event: Event) {
    event.preventDefault();
    const userInput = this.gatherUserInput();
    if(Array.isArray(userInput)){
      const [title, desc, people] = userInput; 
      projectState.addProject(title, desc, people);
      this.clearInput();
    }
  }
}



const printINput =  new ProjectInput();
const activePrList =  new ProjectList('active');
const finishedPrList = new ProjectList('finished');

