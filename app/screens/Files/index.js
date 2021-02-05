import React, {Component, createRef, useState} from 'react';
import axios from 'axios';
import ReactPlayer from 'react-player';
import { disableBodyScroll, enableBodyScroll, clearAllBodyScrollLocks } from 'body-scroll-lock';
import './styles.scss';

const renderFileList = (files, selectedID, searchTerm, targetRef, isEditMode, handleClick, handleChange, handleDelete) => {
  if (files.length) {
    return (
      <ul ref={targetRef} className={`filelist ${isEditMode ? 'edit-mode' : ''}`}>
        {
          files.filter(file =>
            decodeURI(file.name.toString())
              .toLowerCase()
              .indexOf(searchTerm.toLowerCase())
            !== -1
          ).map((file, index) => (
            <FileListItem
              key={file.name}
              index={index}
              isDirectory={file.isDirectory}
              file={file.file}
              name={file.basename}
              path={file.path}
              isEditMode={isEditMode}
              isSelected={selectedID == index}
              handleClick={handleClick}
              handleChange={handleChange}
              handleDelete={handleDelete}
            />
          ))
        }
      </ul>
    )
  }
  else {
    return (
      <div className={'message-wrapper'}>
        <p>no files</p>
      </div>
    );
  }
};

const FileListItem = (props) => {
  const [fileName, setFileName] = useState(props.name);

  return (
    <li
      className={`list-item ${props.isSelected ? 'active' : ''}`}
    >
      <a data-index={props.index} data-isdirectory={props.isDirectory} href={props.isDirectory ? props.path : props.file} onClick={props.handleClick}>
        { props.isEditMode ? <button className={'delete-button'} onClick={props.handleDelete}>x</button> : null }
        { props.isEditMode ? <input className={'list-item-edit'} onChange={(e) => setFileName(e.target.value)} onBlur={props.handleChange} data-oldvalue={props.path} value={fileName} />: <span className={'list-item-title'}>{props.name}</span> }
        {
          props.isDirectory ?
            <span className={'directoryIcon'}>&#x1F4C1;</span> :
            null
        }
      </a>
    </li>
  );
}

class Files extends Component {
  constructor(props) {
    super(props);

    this.state = {
      directory: '',
      homePath: '',
      files: [],
      hasFileListLoaded: false,
      isFileListLoading: false,
      isTouchingPlayer: false,
      searchTerm: '',
      selectedFileID: null,
      lastSelectedFileID: null,
      lastDirID: null,
      fileListPreSearchOffset: null,
      selectedFileURL: '#',
      editModeEnabled: false
    };

    this.pollInterval;
    this.targetElement = createRef();
  }

  componentDidMount() {
    this.getDirectory();
    this.updateHomePath();

    this.pollInterval = setInterval(() => this.getDirectory(), 5000);
  }

  componentWillUnmount() {
    clearAllBodyScrollLocks();
    clearInterval(this.pollInterval);
  }

  async getDirectory() {
    this.setState({isFileListLoading: true});

    let query = '';
    if (this.state.directory) {
      query = `?path=${encodeURI(this.state.directory)}`;
    }

    const response = await axios.get(`/directory${query}`);

    if (response.data.status === 'ok') {
      this.setState({
        hasFileListLoaded: true,
        isFileListLoading: false,
        files: response.data.files,
        directory: response.data.newPath
      });

      if (response.data.files && !this.state.isTouchingPlayer) {
        disableBodyScroll(this.targetElement.current);
      }
    }
    else {
      this.setState({
        hasFileListLoaded: true,
        isFileListLoading: false,
        files: [],
      });
    }
  }

  async upDirectory() {
    this.setState({isFileListLoading: true});

    let query = '';
    if (this.state.directory) {
      query = `?path=${encodeURI(this.state.directory)}&up=true`;
    }

    const response = await axios.get(`/directory${query}`);
    const lastDirID = this.state.lastDirID;

    this.setState({
      isFileListLoading: false,
      files: response.data.files,
      directory: response.data.newPath,
      selectedFileID: this.state.lastSelectedFileID,
      lastSelectedFileID: null,
      lastDirID: null,
    });

    const activeItemY = document.querySelector(`[data-index="${lastDirID}"]`).closest('li').offsetTop;

    document.querySelector('.filelist').scrollTo(0, activeItemY);
  }

  handleSearch(e) {
    if (!this.state.fileListPreSearchOffset) {
      this.setState({
        fileListPreSearchOffset: document.querySelector('.filelist').scrollTop
      })
    }

    this.setState({searchTerm: e.target.value}, () => {
      if(!this.state.searchTerm) {
        document.querySelector('.filelist').scrollTo(0, this.state.fileListPreSearchOffset);
        this.setState({fileListPreSearchOffset: null});
      }
    });
  }

  handlePlayerTouch(isTouchingPlayer) {
    if (isTouchingPlayer) {
      this.setState({isTouchingPlayer});
      enableBodyScroll(this.targetElement.current)
    }
    else {
      this.setState({isTouchingPlayer});
      disableBodyScroll(this.targetElement.current);
    }
  }

  playFile(selectedFileID, selectedFileURL) {
    this.setState({selectedFileID, selectedFileURL, lastSelectedFileID: null});
  }

  async updateHomePath() {
    const response = await axios.get('/homepath');
    this.setState({homePath: response.data});
  }

  clearSearch() {
    this.setState({searchTerm: ''});
  }

  handleItemSelect(e) {
    e.preventDefault();
    if (!this.state.editModeEnabled) {
      if (e.target.getAttribute('data-isdirectory') === 'true') {
        this.setState({
          directory: e.target.getAttribute('href'),
          editModeEnabled: false,
          lastSelectedFileID: this.state.selectedFileID,
          selectedFileID: null,
          lastDirID: e.target.getAttribute('data-index'),
        }, () => {
          this.clearSearch();
          this.getDirectory();
        });
      } else {
        this.playFile(e.target.getAttribute('data-index'), e.target.href)
      }
    }
  }

  async handleItemRename(e) {
    const fileName = e.target.value;
    const oldFileName = e.target.getAttribute('data-oldvalue');
    if (fileName) {
      e.target.setAttribute('data-oldvalue', fileName);
      e.target.value = null;
      e.target.placeholder = fileName;
      await axios.post('/rename', {fileName: encodeURI(fileName), oldFileName: encodeURI(oldFileName)});
      await this.getDirectory();
    }
  }

  async handleItemDelete(e) {
    const fileName = e.target.parentElement.getAttribute('href');
    const isDirectory = e.target.parentElement.getAttribute('data-isdirectory') === 'true' ? true : false;
    if (confirm(`Are you sure you want to delete this ${isDirectory ? 'folder': 'file'}?`)) {
      await axios.post('/delete', {fileName, isDirectory});
      await this.getDirectory();
    }
  }

  render() {
    return (
      <div className={'files-container'}>
        <div className={'list'}>
          <div className={'list-header'}>
            <h2>files&nbsp;<small>({this.state.files.length})</small></h2>
            <button className={`edit-mode-button ${this.state.editModeEnabled ? 'active' : ''}`} onClick={() => this.setState({editModeEnabled: !this.state.editModeEnabled})}>✎</button>
            <div className={'search-wrapper'}>
              <input type={'text'} placeholder={'search...'} value={this.state.searchTerm} onChange={(e) => this.handleSearch(e)} />
              {
                this.state.searchTerm ?
                  <button className={'clear-search'} onClick={() => this.clearSearch()}>
                    x
                  </button> :
                  null
              }
            </div>
          </div>

          <div className={'list-body'}>
            {
              (this.state.isFileListLoading && !this.state.hasFileListLoaded) ?
                <div className={'message-wrapper'}><p>loading...</p></div> :
                renderFileList(this.state.files, this.state.selectedFileID, this.state.searchTerm, this.targetElement, this.state.editModeEnabled, this.handleItemSelect.bind(this), this.handleItemRename.bind(this), this.handleItemDelete.bind(this))
            }
            {
              this.state.homePath !== this.state.directory ?
                <button className={'up-dir-button'} onClick={() => this.upDirectory()}>&#8624;</button> :
                null
            }
          </div>
        </div>

        <div className={'fileviewer-wrapper'}>
          <ReactPlayer
            onTouchEnd={() => this.handlePlayerTouch(false)}
            onTouchStart={() => this.handlePlayerTouch(true)}
            playing={true} playsinline url={this.state.selectedFileURL} controls height={'100%'} width={'100%'} />
        </div>
      </div>
    );
  }
}

export default Files;
